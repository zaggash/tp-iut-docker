---
title: "Le Dockerfile"
date: 2020-06-12T23:23:40+02:00
weight: 1
draft: false
---

### Un Quoi ?

Le dockerfile est en gros la recette pour créer une image Docker.  
Il contient toutes les instructions pour indiquer au daemon quoi faire et comment doit être construite notre image.  
La commande à utiliser est `docker build`  

### Notre premier Dockerfile
{{% notice info %}}
Vous pouvez utiliser la commande suivante pour nettoyer votre environnement docker du travail précédent.  
`docker rm -f $(docker ps -q); docker system prune -af --volumes`  
Ces commandes suppriment les conteneurs actifs puis les volumes/images/conteneurs inactifs
{{% /notice %}}

#### FROM et RUN
Nous allons construire ensemble le premier Dockerfile.  
Le DockerFile doit être dans un dossier **vide**.  

```bash
$ mkdir mon_image
```
Puis ajouter un Dockerfile dans ce répertoire.
```bash
$ cd mon_image
$ touch Dockerfile
```

Lancer l'éditeur de votre choix pour modifier le Dockerfile
```dockerfile
FROM ubuntu
RUN apt-get update
RUN apt-get -y install figlet
```

- **FROM** indique l'image de base pour notre build.  
- **RUN** Execute notre commande pendant le build, RUN ne doit pas être interactif, d'où le *-y* durant le apt-get.  

Sauvegarder votre Dockerfile, puis on execute le build  
```bash
$ docker build -t figlet .
```
- **-t** indique le nom de notre image (nous reviendrons sur le nommage juste après)  
- **.** indique l'emplacement du contexte de notre build.  
      
`Sending build context to Docker daemon  2.048kB`  
le contexte est envoyé à dockerd sous forme de tarball, utile si on build sur une machine distante.

Nous pouvons désormais utiliser notre nouvelle image et executer le programme `figlet`
```bash
$ docker run -ti figlet
root@7d038d8e1960:/# figlet Good Job
```

#### CMD et ENTRYPOINT
Afin de lancer automatiquement un processus dans notre image au lieu de l'executer dans un shell, nous pouvons utiliser CMD ou ENTRYPOINT.  

- ***CMD*** permet de definir une commande par defaut quand aucune n'est donnée au lancement du conteneur.  
Un seul CMD est autorisé, seul le dernier est pris en compte.

- ***ENTRYPOINT*** defini une commande de base.  
Le CMD ou les arguments en ligne de commande seront les paramètres de l'ENTRYPOINT  

{{% notice warning %}}
Editer le Dockerfile précédent pour ajouter un **ENTRYPOINT** et un **CMD** afin d'afficher `I Love Containers` avec figlet.  
la conteneur sera lancé avec `docker run ilovecontainers`
{{% /notice %}}

{{% notice warning %}}
Avec **cette dernière image**, je veux lancer un conteneur en mode **interactif sous bash**. 
Quel serait la marche a suivre ?
Vous pouvez chercher dans la documentation de Docker pour vous familiariser avec le site:  
[Documentation: Docker build](https://docs.docker.com/engine/reference/builder/)
{{% /notice %}}


### Tips and Tricks

On ne va pas trop rentrer dans les details, mais il faut savoir qu'il y a quelques bonnes habitudes à respecter lorsque l'on créé un Dockerfile.  
En voici quelques unes pour ne pas être étonné de les voir, si vous tombez sur certain Dockerfile.  

- Il faut reduire le nombre de layers
- Ne pas installer des paquets inutiles
- Supprimer les fichiers temporaires et caches avant de changer de layer.  
  Sachant que chaque layer est indépendant, supprimer un fichier créé dans un layer précedant ne reduira pas la taille de l'image.

Pour en savoir plus, le site de Docker est une bonne base d'information pour commencer.
Je reste dispo pour les questions si besoin.
