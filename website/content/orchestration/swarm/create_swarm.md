---
title: "Créer son cluster Swarm"
date: 2020-06-15T21:37:57+02:00
draft: false
weight: 1
---

### Activation 

Swarm n'est pas actif par defaut dans Docker.  
Essayer la commande suivante:  
```bash
$ docker node ls
```

Le **premier noeud** d'un cluster Swarm est initialisé avec `docker swarm init`  
{{% notice info %}}
Ne pas executer `docker swarm init` sur tous les noeuds !  
Vous auriez plusieurs clusters différents.
{{% /notice %}}

---

Pour commencer il faut bien nommer ses machines.  
Vérifier que les VMs ont bien 3 noms distincts, sinon renommer les !
```bash
$ sudo hostnamectl set-hostname node1
$ sudo hostnamectl set-hostname node2
$ sudo hostnamectl set-hostname node3
```
Puis vérifier qu'ils sont bien synchronisé à un serveur de temps  
Raft est très sensible sur les timing  
```bash
$ sudo timedatectl set-timezone Europe/Paris
$ sudo timedatectl set-ntp true
```
---

Maintenant allons créer notre cluster sur le `node1`
```bash
$ docker swarm init
```
{{% notice style="info" %}}
Il est possible de choisir son interface de `control`(--advertise-addr/--listen-addr) et de `data`(--data-path-addr)  
Le `control plane` est utilisé par Swarm pour les communications manager/worker, election Raft,...
Le `data plane` est utilisé pour les communications entre les conteneurs.
{{% /notice %}}

#### Les tokens

Docker à générer deux tokens pour notre cluster, un pour joindre les managers et l'autre pour joindre les workers.    
Vous en avez aperçu un juste après l'initialisation.  
```bash
To add a worker to this swarm, run the following command:
    docker swarm join --token SWMTKN-1-29jzjk0kmcunwcxlweugx75jhe0iqgokj2hdfkrad2ebrv640t-dsup5h5kmp5o7fndkk05zprkm 10.59.72.14:2377
```

Verifier que nous avons bien activé Swarm
```bash
$ docker info
[...]
Swarm: active
[...]
```

Ressayons la commande de tout a l'heure
```bash
$ docker node ls
```

#### Ajouter un noeud
Un cluster avec noeud c'est pas fun.
Ajoutons `node2` à notre cluster en tant que `worker`.
Sur le `node1`
```bash
// Afficher le token des worker
$ docker swarm join-token worker  
```
Puis executer la commande affichée en sortie sur `node2`
```bash
$ ssh node2
$ docker swarm join ...
```


Restons un peu sur ce `node2`
Verifions que la commande à bien activé Swarm
```bash
$ docker info | grep Swarm
```
Cependant, les commandes Swarm ne fonctionneront pas
```bash
$ docker node ls
```
Nous sommes sur `node2`, un worker, seuls les managers peuvent recevoir les commandes de cluster.  

Retournons sur `node1` et voyons a quoi ressemble notre cluster maintenant.
```bash
$ docker node ls
```

{{% notice tip %}}
Les tokens sont générés à l'initialisation du cluster, ce sont des certificats signés par le CA du cluster.  
On peut les regénérer avec `docker swarm join-token --rotate <worker|manager>` si ils sont compromis.  
{{% /notice %}}

{{% notice style="info" %}}
Le `control plance` est crypté, les clefs sont regénérés toutes les 12h.  
Les certificats eux sont valable 90 jours par défaut.  
Le `data plane`, lui, n'est pas crypté par défaut mais peut être activé pas réseau.
{{% /notice %}}

#### Ajouter un autre manager
Nous avons donc un manager `node1` et un worker `node2`.  
Si on perd `node1`, on perd le quorum du Raft et c'est mal.  
Les services continueront de fonctionner, mais plus aucune commande cluster ne sera accepté.  

Si le manager ne revient pas, il va falloir faire une réparation manuelle, personne ne veut ça.  

Allons ajouter le `node3` en tant que manager.
```bash
// Sur un manager
$ docker docker swarm join-token manager
// Sur notre node3
$ docker swarm join --token ...
```

{{% notice style="info" %}}
Essayer la commande `docker node ls` sur le `node3` 
L'étoile (*) à coté de l'ID du neud correspond au manager auquel nous sommes connectés.  
{{% /notice %}}

Il est possible de changer le rôle d'un noeud via un manager.  
Essayer de passer `node2` en tant que manager
```bash
$ docker node promote node2
```

{{% notice tip %}}
**Combien de manager a-t-on besoin ?**  
*2N+1 noeuds peuvent tolérer N pannes.*  
1 manager = Pas de panne  
3 managers = 1 panne  
5 managers = 2 pannes (Ca nous donne le droit à l'erreur en cas de maintenance)  
{{% /notice %}}

I ne faut pas mettre trop de manager, en règle générale 5 est suffisant pour un cluster, même très gros.  
Plus on ajoute de managers, plus la réplication Raft mettra de temps.  
La replication Raft doit essayer de rester sous les **10ms** entre les managers.  