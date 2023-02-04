---
title: "Les Stacks"
date: 2020-06-15T21:37:57+02:00
draft: false
weight: 4
---

`docker-compose` est bien pour le développement en locale.  

Il existe plusieurs versions de compose-file : [https://docs.docker.com/compose/compose-file/](https://docs.docker.com/compose/compose-file/)  

A partir de la version 3, les compose-file.yaml peuvent être utilisé pour les déploiements dans Swarm.  

On déploie un compose-file dans swarm avec la commande `docker stack deploy -c <mon_compose.yaml> <nom_de_ma_stack>`  
Dans cette version de compose, une section `deploy` est intégré est permet de configurer les déploiements.  

### Une stack simple.  

En mode service sans la stack, on l'aurait déployé comme ceci
`docker service create --publish 1234:80 zaggash/demo-webapp`

Maintenant, on va déployer la stack suivante
```yaml
version: "3.8"
services:
  web:
    image: zaggash/demo-webapp
    ports:
      - "1234:80"
```

Les stack sont disponibles dans le dossier du TP.

```bash
$ cd ~/tp-iut-docker/stacks
$ ls -l
$ cat webapp.yml 
$ docker stack deploy -c webapp.yml mon_app
```  

Les stacks sont manipulées avec `docker stack`  
Implicitement, il est executé l'equivalent d'un `docker service ...`  
Les stacks sont nommées ( ici web) et ce nom sert de namespace pour notre application.  

Vérifier que la stack fonctionne correctement
```bash
$ docker stack ps
$ docker service ls
$ docker service ps mon-app_web
```  

Notre application n'est pas exactement la même qu'avec la commande `docker service create ...`  
* Chaque stack à son propre réseau overlay par défaut.  
* Les services de la stack sont connectés à cet overlay sauf indication contraire.  
* Les services ont des alias sur le réseau qui utilise leur nom.  
* On appelle un service avec `<nom-de-la-stack>_<nom-du-service>`
* Les services ont également un label interne qui désigne la stack à laquelle ils appartiennent.  

On peut relancer un `docker stack deploy ...` pour mettre à jour une stack.  
Si on modifie un service avec `docker service ...`, les modifications seront effacées et remplacées lors d'un prochain `docker stack deploy ...`  

### Mettre à jour un service.  

On veut faire un changement dans notre application;, le processus est le suivant:
* On modifie le code  
* On crée une nouvelle image  
* On pousse la nouvelle version de l'image  
* On exécute la nouvelle image  

On va faire une modification de notre webapp.  
Allez dans le dossier du TP de l'application
```bash
$ cd ~/tp-iut-docker/docker-demoweb/
```

Puis éditer le fichier `print_hostname.sh` de la manière suivante
```bash
#!/usr/bin/env sh
echo "Hey, je suis la v2.0, j'affiche mes IPs" > /usr/share/nginx/html/index.html
echo "$HOSTNAME" >> /usr/share/nginx/html/index.html
echo $(hostname -I) | tr ' ' '\n' >> /usr/share/nginx/html/index.html
```

Vous pouvez ensuite construire l'image et la pousser vers votre compte DockerHub.  
Sinon les images nécessaire existent déjà sur mon compte, ici `zaggash/demo-webapp:v2`  
```bash
$ docker build -t <votre_id_dockerhub>/demo-webapp:v2 .
$ docker login
$ docker push <votre_id_dockerhub>/demo-webapp:v2
```


On retourne dans le dossier `~/tp-iut-docker/stacks` et on modifie notre stack pour prendre en compte la nouvelle image.  
```yml
[...]
    image: zaggash/demo-webapp:v2
[...]
```

Dans un shell, lancer un `curl` avec `watch` pour voir les changements
```bash
$ watch -n1 'curl -sL <ip_d_un_noeud>:1234'
```

Enfin on met à jour l'application et on observe.
```bash
$ docker stack deploy -c webapp.yml mon-app
```

### Les rolling update

On va commencer par ajouter des réplicas à notre application.  
Puis lancer un changement de version.
```bash
$ docker service scale mon-app_web=7  
$ docker service update --image zaggash/demo-webapp:v1 mon-app_web
```

Vous pouvez lancer `docker events` sur un autre shell sur `node1`.  
Avoir un `curl` sur l'application en continue, aide aussi à visualiser.  


#### Changer les règles de mise à jour
On peux changer plusieurs options sur la manière de faire les mises a jour.  
Un exemple sur le parallélisme et le nombre de maximum de conteneur en erreur.  
```bash
$ docker service update --update-parallelism 2 --update-max-failure-ratio .25 mon-app_web
```  

Ici aucun conteneur n'a été remplacé, nous avons uniquement changé les metadata du service.  
On peut les retrouver dans le `docker inspect mon-app_web`  


Dans une stack, ces changements sont représentés par ceci
```yaml
[...]
    image: zaggash/demo-webapp:v2
[...]
    deploy:
    replicas: 10
    update_config:
        parallelism: 2
        delay: 10s
```

### Les rollback  
A n'importe quel moment, même en cours de mise à jour, on peux faire un retour en arrière.  
* En modifiant le compose et en faisant un nouveau deploy
* En utilisant l'argument `--rollback` avec `docker service update `  
* Ou encore avec `docker service rollback`  
  
  Essayons avec notre service
```bash
$ docker service rollback mon-app_web
```

{{% notice style="info" %}}
Que se passe t-il avec notre application ?
{{% /notice %}}

Elle n'est pas mise à jour !
Le rollback revient à la dernière définition du service, voir `PreviousSpec` dans le `docker service inspect mon-app_web`  
Ici nous avions ajouté du parallélisme avec `--update-parallelism 2`, donc le service est maintenant revenu à une définition sans le parallélisme.  
A chaque `docker service update`, la nouvelle définition du service passe en `Spec` et le `Spec` en cours passe en `PreviousSpec`.  

### Les Healthcheck et auto-rollback

Les healthcheck sont des commandes envoyées à intervalles réguliers, et retourne 1 ou 0.  
Elle doivent être rapide car en cas de timeout, le service est déclaré comme non stable.  

On peut définir le healthcheck:  
* Dans le dockerfile  
`HEALTHCHECK --interval=1s --timeout=3s CMD curl -f http://localhost/ || false`  
* Avec la CLI  
`docker run --health-cmd "curl -f http://localhost/ || false" ...`  
`docker service create --health-cmd "curl -f http://localhost/ || false" ...`  
* Dans une stack
```yaml
www:
  image: zaggash/demo-webapp:v1
  healthcheck:
    test: "curl -f https://localhost/ || false"
    timeout: 3s
```

Associé à un service, on peut effectuer un rollback en cas de timeout du healthcheck avec `--update-failure-action rollback`.  

Voilà un exemple complet:
```bash
docker service update \
  --update-delay 5s \
  --update-failure-action rollback \
  --update-max-failure-ratio .25 \
  --update-monitor 5s \
  --update-parallelism 1 \
  --rollback-delay 5s \
  --rollback-failure-action pause \
  --rollback-max-failure-ratio .5 \
  --rollback-monitor 5s \
  --rollback-parallelism 2 \
  --health-cmd "curl -f http://localhost/ || exit 1" \
  --health-interval 2s \
  --health-retries 1 \
  --image image:version service
```  


#### Demo

On va appliquer ces changements à notre stack.  
Tout d'abord, on supprime la stack et on la recrée avec les paramètre de healthcheck et rollback.  
```bash
$ docker stack rm mon-app
$ cd ~/tp-iut-docker/stacks
$ docker stack deploy -c webapp+healthcheck.yml mon-app
```

Puis, on doit créer une image qui plante.  
```bash
$ cd ~/tp-iut-docker/docker-demoweb$
```
Puis on edite le fichier `print_hostname.sh`
```bash
#!/usr/bin/env sh
echo "Hey, je suis la v3.0, je plante" > /usr/share/nginx/html/index.html
echo "$HOSTNAME" >> /usr/share/nginx/html/index.html
echo $(hostname -I) | tr ' ' '\n' >> /usr/share/nginx/html/index.html

sed -i 's/listen.*80;/listen       81;/' /etc/nginx/conf.d/default.conf
```  
Avec ce changement, le service fonctionnera correctement mais l'application n'acceptera pas de connection, le healthcheck va donc planter.  
On build et on push.  
```bash
$ docker build -t <votre_id_dockerhub>/demo-webapp:v3 .
$ docker login
$ docker push <votre_id_dockerhub>/demo-webapp:v3
```  

et enfin on test notre v3
```bash
$ docker service update --image <votre_id_dockerhub>/demo-webapp:v3 mon-app_web
```  


Observer les actions avec un shell qui execute `docker events`.  
Puis un autre shell avec le `curl` en boucle.  
```bash
$ watch -n1 'curl -sL <ip_d_un_noeud>:1234'
```

On voit que le service n'est jamais interrompu et que Swarm détecte le conteneur défectueux.
Puis au final, le service reste sur notre v2.  

