---
title: "Les Volumes"
date: 2020-06-12T23:23:40+02:00
weight: 3
draft: false
---

Les volumes permettent plusieurs choses:

- Passer outre le Copy On Write et utiliser les performances natives des disques.
- Partager des dossiers et fichiers entre les conteneurs
- Partager des dossiers et fichiers entre l'hôte et les conteneurs
- Utiliser des points de montage distant 

Nous allons voir comment utiliser un volume:
- Dans un Dockerfile
- Au demarrage avec l'option **-v**
- En utilisant un volume nommé

---
#### La persistance des données

Illustrons l'état par défaut des données après l'arrêt d'un conteneur

```bash
$ docker container run -ti  --name c1  alpine sh
```

On va créer un dossier et un fichier à l'intérieur
```bash
$ mkdir /mon_dossier && cd /mon_dossier && touch monfichier.txt
```

Nous allons maintenant voir que le layer R/W du conteneur n'est pas accessible depuis l'hôte.  

Commençons par quitter le conteneur
```bash
$ exit
```

On va inspecter le notre conteneur pour trouver l'emplacement du layer.  
On peut utiliser la commande  `inspect` et chercher le mot clef **GraphDriver**
```bash
$ docker container inspect c1
```

On peut egalement utiliser la sortie avancé grâce au Template Go et voir directement l'information.
```bash
$ docker container inspect -f '{{ json .GraphDriver }}' c1 | jq
```

Vous devriez avoir un output qui ressemble à ça:  
```
{
  "Data": {
    "LowerDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0-init/diff:/var/lib/docker/overlay2/3385f7f394c776c48b391cd6e407816d3026cea3ff9f5526f05d631ff6b4ae55/diff",
    "MergedDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0/merged",
    "UpperDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0/diff",
    "WorkDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0/work"
  },
  "Name": "overlay2"
}
```

Depuis l'hôte, si on regarde l'emplacement du dossier contenu dans la key **UpperDir**, on peut voir que notre dossier /mon_dossier et notre fichier monfichier.txt sont là.  
Executer la commande suivante pour voir le contenu de notre dossier /mon_dossier:
```
$ ls /var/lib/docker/overlay2/[ID_LAYER]/diff/mon_dossier
```

Que se passe t-il si notre conteneur venait à être supprimé ?
```bash
$ docker container rm c1
```

{{% notice info %}}
Il semble que le dossier **UpperDir** ci-dessus, n'existe plus. Pouvez vous le confirmer ?  
Essayer de lancer de nouveau un `ls`
{{% /notice %}}

Cela prouve que les données dans un conteneur ne sont pas persistantes, elles sont supprimées en même temps que le conteneur.  

#### Definir un volume dans un Dockerfile

Nous allons créér un Dockerfile basé sur `alpine` et definir /mon_dossier en tant que volume.  
Cela signifie que tout ce que sera écrit par un conteneur dans /mon_dossier existera en dehors du layer R/W du conteneur.

Utiliser le Dockerfile suivant:  
```dockerfile
FROM alpine
VOLUME ["/mon_dossier"]
ENTRYPOINT ["/bin/sh"]
```

{{% notice info %}}
On definit ici **/bin/sh** en Entrypoint afin d'avoir un shell en mode intéractif sans devoir spécifier de commande.
{{% /notice %}}


Nous pouvons alors lancer la création de l'image
```bash
$ docker image build -t img1 .
```

On peut alors lancer notre conteneur en mode intéractif à partir de cette image.
```bash
$ docker container run -ti --name c2 img1
/# 
```

On peut donc maintenant aller dans /mon_dossier et créer un fichier.
```bash
/# cd /mon_dossier
/# touch hello.txt
/# ls
hello.txt
```

On peut quitter le conteneur en le laissant tourner en arrière plan.  
Il faut utiliser la combinaison de raccourcis : `ctrl+P/ctrl+Q`  
Puis vérifier que le conteneur est toujours actif.
```bash
$ docker ps
```

{{% notice info %}}
Le conteneur c2 devrait être listé
{{% /notice %}}

On va alors inspecter ce conteneur pour connaître l'emplacement de notre volume sur la VM.  
On va utiliser directement les templates GO mais on pourrait utiliser un `docker inspect` puis chercher à la main la clef **Mount**  
```bash
$ docker inspect -f '{{ json .Mounts }}'  c2 | jq
```

Vous devriez avoir une sortie qui ressemble à ca:  
```bash
[
  {
    "Type": "volume",
    "Name": "2d47da3c88436afa4b35b084ba0060009066b26b042ee7b161b1d3215f1b06fd",
    "Source": "/var/lib/docker/volumes/2d47da3c88436afa4b35b084ba0060009066b26b042ee7b161b1d3215f1b06fd/_data",
    "Destination": "/mon_dossier",
    "Driver": "local",
    "Mode": "",
    "RW": true,
    "Propagation": ""
  }
]
```

Cette sortie montre que le volume /mon_dossier est situé dans `/var/lib/docker/volumes/[ID_VOLUME]/_data`  
Remplacer le chemin par le votre et vérifier que le fichier `hello.txt` est bien présent.  

On peut maintenant supprimer c2
```bash
$ docker rm -f c2
```

Valider que le fichier est toujours disponible à l'emplacement précédent.

#### Definir un volume en mode intéractif

On a vu comment définir un volume via un Dockerfile, on peut aussi le définir au lancement avec l'option `-v`  

Executons un conteneur à partir de l'image `alpine`, on utilisera l'option `-d` pour le passer en arrière plan.  
Afin que le processus PID1 du conteneur reste actif, on utilise une commande qui pinger 1.1.1.1 en continue et ecrire le résultat dans /mon_dossier.  
```bash
$ docker run -d --name c3 -v /mon_dossier alpine sh -c 'ping 1.1.1.1 > /mon_dossier/ping.txt'
```

Allons chercher l'emplacement du volume:

```bash
$ docker inspect -f '{{ json .Mounts }}' c3 | jq
```

Nous avons quasiment la même sortie qu'avec le Dockefile, à l'exception des IDs
```
[
  {
    "Type": "volume",
    "Name": "0534a1308b43b5bb7f4f728daeedea7e9962a65b47df4d37e01b2ef89510bd13",
    "Source": "/var/lib/docker/volumes/0534a1308b43b5bb7f4f728daeedea7e9962a65b47df4d37e01b2ef89510bd13/_data",
    "Destination": "/mon_dossier",
    "Driver": "local",
    "Mode": "",
    "RW": true,
    "Propagation": ""
  }
]
```

Vérifions que le fichier existe bien dans le volume:
```
$ tail -f /var/lib/docker/volumes/<VOLUME_ID>/_data/ping.txt
64 bytes from 1.1.1.1: seq=11 ttl=59 time=0.807 ms
64 bytes from 1.1.1.1: seq=12 ttl=59 time=0.875 ms
64 bytes from 1.1.1.1: seq=13 ttl=59 time=0.828 ms
64 bytes from 1.1.1.1: seq=14 ttl=59 time=1.101 ms
64 bytes from 1.1.1.1: seq=15 ttl=59 time=1.039 ms
64 bytes from 1.1.1.1: seq=16 ttl=59 time=0.804 ms
[...]
```

Le fichier ping.txt est rempli regulièrement par la commande de notre conteneur.  
Si on supprime le conteneur, le processus va arrêter de remplir le fichier mais il ne sera psa supprimé.  

#### Utiliser un volume nommé

Nous allons utiliser la commande pour créer un volume nommé **web**.  
```bash
$ docker volume create --name web
```

Si nous listons les volumes existant, il devrait y avoir notre volume **web**.  
```bash
$ docker volume ls
```

L'output devrait ressembler à ça:
```
DRIVER              VOLUME NAME
[...]]
local               web
```

Pour les volumes, comme presque tous les objets dans Docker, on peut executer la commande `inpect`.  
```bash
$ docker volume inspect web
[
    {
        "CreatedAt": "2020-06-14T14:27:06Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/web/_data",
        "Name": "web",
        "Options": {},
        "Scope": "local"
    }
]
```

Le **Mountpoint** défini ici est le chemin sur l'hôte ou l'on peut trouver le volume.  
On peut voir que le chemin des volumes nommés utilise le nom du volume au lieu de l'ID comme dans les exemples précédents.  

On peut maintenant utiliser ce volume et le monter dans un conteneur.  
Nous allons utiliser `nginx` et monter le volume **web** dans le répertoire `/usr/share/nginx/html` du conteneur.  

{{% notice style="info" %}}
`/usr/share/nginx/html` est le répertoire par defaut du serveur nginx. Il contient 2 fichiers : index.html et 50x.html
{{% /notice %}}

```bash
$ docker run -d --name www -p 8080:80 -v web:/usr/share/nginx/html nginx
```

Depuis l'hôte, allons voir le contenu du volume.  
```bash
$ ls /var/lib/docker/volumes/web/_data
50x.html  index.html
```

Le contenu du dossier **/usr/share/nginx/html** du conteneur **www** à été copié dans le dossier **/var/lib/docker/volumes/html/_data** sur l'hôte.  
Allons vérifier la page d'accueil de **nginx**  
```bash
$ curl 127.0.0.1:8080
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

Depuis l'hôte, nous pouvons désormais modifier le fichier index.html et vérifier que nos changements sont bien pris en compte par le conteneur.  
```bash
$ cat<<END >/var/lib/docker/volumes/web/_data/index.html
TOC TOC TOC !
END
```

Allons voir de nouveau la page web
```bash
$ curl 127.0.0.1:8080
TOC TOC TOC !
```
Nous pouvons voir les changements que nous avons effectués.

#### Monter un dossier de la VM dans un conteneur.

Nous allons maintenant monter un dossier de l'hôte dans un conteneur en faisant un bind-mount avec l'option `-v`  : **-v CHEMIN_HOTE:CHEMIN_CONTENEUR**

{{% notice style="info" %}}
CHEMIN_HOTE et CHEMIN_CONTENEUR peuvent être un dossier ou un fichier.  
Le chemin sur l'hôte doit exister.  
{{% /notice %}}

Il y a deux cas bien distincts:  
- le CHEMIN_CONTENEUR n'existe pas dans le conteneur.  
- le CHEMIN_CONTENEUR existe dans le conteneur.  

##### N'existe pas

Executer un conteneur alpine en montant le /tmp local dans le dossier /mon_dossier du conteneur.  
```bash
$ docker run -ti -v /tmp:/mon_dossier alpine sh
```

On arrive dans le shell de notre conteneur. Par défaut, il n'a pas de répertoire /mon_dossier dans l'image alpine.  
Quel est l'impact de notre bind mount ?
```bash
$ ls /mon_dossier
```
Le répertoire /mon_dossier à été créé dans le conteneur et contient les fichiers de /tmp de la VM.  
Nous pouvons maintenant modifier ces fichiers à partir du conteneur ou de l'hôte.  

##### Existe

Executer un conteneur nginx en montant le /tmp local dans le dossier /usr/share/nginx/html du conteneur.  
```bash
$ docker run -ti -v /tmp:/usr/share/nginx/html nginx bash
```

Est ce que les fichiers par défaut index.html et 50x.html sont présents dans le dossier /usr/share/nginx/html du conteneur ?  
```bash
$ ls /usr/share/nginx/html
```

Non.  
Le contenu du dossier du conteneur à été remplacé avec le contenu du dossier de l'hôte.

Les **bind-mount** sont utiles en mode développement car ils permettent, par exemple, de partager le code source de l'hôte avec le conteneur.  
