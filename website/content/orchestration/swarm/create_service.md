---
title: "Créer un service"
date: 2020-06-15T21:37:57+02:00
draft: false
weight: 2
---

{{% notice warning %}}
***Pour les besoins du TP, on va garder un manager et 2 workers.***  
***Les applications ne sont pas critiques et nous sommes en mode POC.***  
On va donc ne garder que `node1` en tant que manager.  
Executer la commande suivante sur `node1` :  
`$ docker node demote node2`  
`$ docker node demote node3`
{{% /notice %}}

&nbsp;  
&nbsp;  


### Lancer le service  

On lance un service avec la commande `docker service create ...`, on peut faire l'analogie avec `docker run ...`  
Créer un service avec une image alpine qui va ping 1.1.1.1:
```bash
$ docker service create --name pingpong alpine ping 1.1.1.1
```  
Vérifier le resultat
```bash
$ docker service ps pingpong
```

### Inspecter les logs  
De la même manière que l'on irait voir les journaux d'un conteneur avec `docker logs ...`  
On utilise ici `docker service logs ... `
```bash
$ docker service logs pingpong
```

Avec la commande `docker service ps` on peut voir où notre `task` a été deployé.  
```bash
$ docker service ps pingpong
// Chercher dans la colonne NODE
```

Connectez vous sur ce noeud et lister les conteneur `docker ps` puis verifier les logs de notre conteneur.  
Revenez ensuite sur le *manager*.  

### Scaling
On va maintenant créer 2 copies de notre service sur chaque noeud du cluster.  
```bash
$ docker service scale pingpong=6
```  

Vérifier avec `docker service ps ...` où sont deployés les tasks, et vérifier avec `docker ps` les conteneurs sur `node1`  
On voit que les opérations de scaling peuvent prendre du temps.
Si l'on souhaite recupérer la main, on peut utiliser `--detach=true`.  
La commande ne va pas se terminer plus rapidement, mais on pourra éxécuter d'autres commandes pendant ce temps.  
Voyons ca de suite:
```bash
$ docker service scale pingpong=24 --detach=true && watch -n1 'docker service ps pingpong'
```

On peut maintenant arrêter le flood :)  
```bash
$ docker service rm pingpong
```  

### Avec un port  
On peut exposer un service de la même manière qu'avec la commande `docker run`, à quelques différances près.
Avec docker `service create -p HOST:TASK` :  
* Le port HOST sera disponible sur TOUS les noeuds du swarm.
* Les requêtes seront Load Balancé entre toutes les tasks. 

On va deployer un service ElasticSearch, on va l'appeler `demo`
```bash
$ docker service create --name demo --publish 9200:9200 --replicas 5 elasticsearch:2-alpine
```

Pendant l'initialisation du service, on peut voir plusieurs etapes.  
* assigned  (assignement de la task à un noeud)
* preparing (téléchargement de l'image)
* starting
* running

Quand une task est arrêtée, elle ne peut pas être redémarrée, une nouvelle sera créée à sa place.  

![Services](/images/service-lifecycle.png?featherlight=false&width=40pc)  


On peut tester notre service, il écoute sur le port 9200 des noeuds du cluster.
```bash
$ curl -sL 127.0.0.1:9200
```  
ElasticSearch nous retourne un json avec les infos sur l'instance.  
On retrouve des noms de Super Heros dans la clef `name`.  
Essayons d'executer la commande plusieurs fois, on devrait voir plusieurs noms.  
```bash
for N in $(seq 1 10); do
    curl -sL 127.0.0.1:9200 | jq -r '.name'
done
```  
Le trafic est géré par le `routing mesh`.  
Chaque requête est delivrée par une des instances de notre service en Round Robin.  

![Mesh](/images/routing-mesh.png?featherlight=false&width=40pc)  

{{% notice tip %}}
Le LoadBalancing est opérée par IPVS, chaque noeud à donc son LoadBalancer.  
Mais IPVS ne gére pas le Layer7.  
Il faut un service dans Swarm pour router les requêtes vers les bons services.  
Ce service soit être compatible avec Swarm pour modifier sa config dynamiquement.  
Il existe par exemple Traefik qui le fait très bien.  
{{% /notice %}}

