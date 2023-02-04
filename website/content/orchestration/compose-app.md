---
title: "Une app Docker Compose"
date: 2020-06-14T22:12:23+02:00
draft: false
weight: 2
---

**Docker** fournit [un repository Github](https://github.com/dockersamples/) avec plusieurs applications pour tester Docker.  
Nous allons utiliser l'application ***dockercoins*** pour essayer Docker Compose.

J'ai préparé l'application dans le repo du TP.  
Vous pouvez récupérer le repo sur la machine en clonant le repo git du TP. 
```bash
$ git clone https://github.com/zaggash/tp-iut-docker.git
$ cd tp-iut-docker/
$ cd dockercoins/
```
![Architecture](/images/dockercoins-diagram.svg?featherlight=false&width=30pc)

On ne va pas rentrer dans trop de details concernant la syntaxe d'un `docker-compose.yaml`.  
Cela prendrait beaucoup de temps et [la documentation de Docker](https://docs.docker.com/compose/compose-file/) est un bien meilleur référentiel avec un tas d'exemples et d'explications.  

### Lancer l'application

Docker compose est très pratique en mode developpement.  
Cela permet de lancer une stack applicative complète à partir des fichiers présents sur notre machine.  
On lance l'application avec `docker-compose`  
```bash
$ docker-compose up
```

Compose demande à Docker de construire l'application en créant des images, puis de lancer les conteneurs et enfin afficher les logs.  

L'application est composé de 5 services:  
    * `rng` = un service web qui génére des bits aléatoires  
    * `hasher` = un service web qui hash les bits reçu  
    * `worker` = Un processus qui qui fait appel a `rng` et `haser`  
    * `webui` = Une interface web  
    * `redis` = La base de donnée  

`worker` fait appel à `rng` avec un GET pour générer un byte aléatoire, puis il le renvoie avec un POST à `hasher`.  
Indéfiniment...  
`worker` met à jour `redis` a chaque boucle.  
`webui` permet d'afficher les resultats.  

Aucune adresse IP n'est spécifiée, que ce soit dans le code ou dans le `docker-compose.yaml`.  
Les applications utilisent le nom des services respectifs pour atteindre les conteneurs.
Vous pouvez voir dans `worker/worker.py`
```python
redis = Redis("redis")

def get_random_bytes():
    r = requests.get("http://rng/32")
    return r.content

def hash_bytes(data):
    r = requests.post("http://hasher/",
                      data=data,
                      headers={"Content-Type": "application/octet-stream"})
```

{{% notice warning %}}
Chercher avec les commandes docker ou dans le fichier compose, le port sur lequel est exposé `webui`
{{% /notice %}}

On peut maintenant arrêter l'application avec un `ctrl+c`  
Docker va stopper les conteneur avec un TERM puis un KILL si necessaire.  
On peut forcer le KILL avec un deuxième `ctrl+c`.

#### En arrière plan

On peut relancer l'application en arrière plan
```bash
$ docker-compose up -d
// Puis
$ docker-compose ps
$ docker-compose logs --tail 10 --follow
```

### Scaling UP

Notre but va être d'accélérer l'application sans toucher au code.
Mais avant on va chercher si il y a un bottleneck ( Pas assez de RAM, de CPU, IO ?)

{{% notice info %}}
Essayer de trouver par vous même, sinon rdv à la suite.
{{% /notice %}}

Pour le CPU et la RAM on va lancer `top`, puis chercher les cycles idle et la RAM Free.  
`vmstat 1 10` va nous donner un extrait sur 10s pour voir les IO disque.

{{% notice info %}}
Y a t-il assez de ressource ?
{{% /notice %}}

#### 2 workers
Ajouter un nouveau `worker` à l'application
```bash
$ docker-compose up -d --scale worker=2
```

Puis ouvrir de nouveau le navigateur sur l'interface Web.  

{{% notice info %}}
Y a t-il un impact sur les ressources ?
{{% /notice %}}

#### 10 workers alors !

On va donc augmenter les workers jusque 10 et l'application ira 10x plus vite.
```bash
$ docker-compose up -d --scale worker=10
```
{{% notice info %}}
Est ce bien le cas ?
{{% /notice %}}

Vérifions les ressources CPU, RAM, IO une nouvelle fois.
Puis la latence des deux backend web.
```bash
$ top
$ vmstat 1 10
// Latence rng, exposé sur le port 8001
$ httping -fc 10 127.0.0.1:8001
// Latence hasher, sur le port 8002
$ httping -fc 10 127.0.0.1:8002
```
{{% notice info %}}
Quel service pose problème ?
Comment peut on résoudre le problème ?
{{% /notice %}}


### Stopper l'application

Avant de passer à autre chose, je suis disponible pour faire un point sur l'avancement et les questions que vous pourriez avoir.
Des problèmes ?

On peut maintenant arrêter l'application
```bash
$ docker-compose down
```
