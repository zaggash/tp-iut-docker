---
title: "Retour sur notre Application"
date: 2020-06-15T21:37:57+02:00
draft: false
weight: 4
---
{{% notice info %}}
Pour commencer cette partie, on fait le ménage.  
`docker service rm $(docker service ls -q)`
{{% /notice %}}

Nous allons maintenant reprendre l'application Dockercoin et la faire tourner dans notre cluster.  
Nous allons construire les images, les envoyer sur le hub, puis les exécuter dans le cluster.  


Ici nous sommes obligé d'envoyer les images dans un registry.  
Avec la commande `docker-compose up`, toutes les images de nos services sont construite en local.  
Mais pour maintenant, nous avons besoin que ces images soit distribuées entre tous les noeuds du cluster.  

Le workflow ressemble un peu ça:  
* docker build ...  
* docker push ...  
* docker service create ...  

{{% notice tip %}}
Pour plus de simplicité, nous allons envoyer les images sur le dockerhub.  
Mais il serait possible de créer son propre registry ou de les envoyer dans un registry privé.
{{% /notice %}}


### Build and Ship

Pour se connecter au DockerHub et pouvoir envoyer les images, ne pas oublier de se logguer avec `docker login`  

Puis ensuite se rendre dans le dossier ou vous avez cloné le dépôt GitHub du TP.
```bash
cd ~/tp-iut-docker/dockercoins/
export REGISTRY=docker.io
export USER_NAMESPACE=<votre_dockerhub_id>
export TAG=v1.0
for SERVICE in hasher rng webui worker; do
  docker build -t $REGISTRY/$USER_NAMESPACE/$SERVICE:$TAG ./$SERVICE
  docker push $REGISTRY/$USER_NAMESPACE/$SERVICE:$TAG
done
```  

### Run

#### Préparer l'overlay
Rappelez-vous, nos services ont besoin de communiquer entre eux.  
Pour cela, nous allons avoir besoin d'un réseau overlay pour passer d'un noeud à l'autre.  

```bash
$ docker network create --driver overlay dockercoins  
$ docker network ls
```
{{% notice tip %}}
Bien spécifier **--driver overlay** autrement un bridge est créé par défaut.
{{% /notice %}}

#### Les services
On commence par déployer `Redis`, on utilise ici l'image officiel.  
```bash
$ docker service create --network dockercoins --name redis redis
```  

Puis on démarre les autres services un par un en utilisant les images envoyées just avant.  
```bash
export REGISTRY=docker.io
export USER_NAMESPACE=<votre_dockerhub_id>
export TAG=v1.0
for SERVICE in hasher rng webui worker; do
  docker service create --network dockercoins --detach=true \
    --name $SERVICE $REGISTRY/$USER_NAMESPACE/$SERVICE:$TAG
done
```  

### Publier le port de la Webui  

Nous avons besoin de se connecter à la webui, mais nous n'avons publié aucun port.  
```bash
$ docker service ps webui
$ docker service update webui --publish-add 8000:80
$ docker service ps webui
```
{{% notice tip %}}
On peut également supprimer un port publié avec `--publish-rm`  
{{% /notice %}}

On voit que le premier déploiement a été supprimé puis remplacé par la nouvelle version avec le port publié.  
L'application est maintenant disponible sur le port 8000.  
Vous pouvez ouvrir votre navigateur sur le port `8000` de n'importe quel noeud du cluster.  

### Sale Up
#### Workers

On peut également ajouter des worker comme avec `docker-compose`
```bash
$ docker service update worker --replicas 15
// OU
$ docker service scale worker=10
```

Nous voilà dans la même situation que tout à l'heure avec `docker-compose` mais cette fois au sein d'un cluster de 3 machines.  
Vous pouvez vérifier sur la webui que la vitesse à bien augmentée.  

#### rng
Nous avions vu que le service `rng` était le point bloquant.  
Il nous faut maximiser l'entropie pour augmenter la génération de hash pour nos worker.  
Pour cela, on va lancer une instance du service `rng` sur chaque noeud.  

`Swarmkit` à prévu ce genre de déploiement, mais nous devons recréer le service, on ne peux pas activer/désactiver un deploiement globale.  

```bash
// On supprime le service
$ docker service rm rng
// Puis on le relance en activant l\'ordonnancement global
$ docker service create --name rng --network dockercoins --mode global \
    $REGISTRY/$USER_NAMESPACE/rng:$TAG
```  
