---
title: "Swarm"
date: 2020-06-15T21:37:57+02:00
draft: false
weight: 3
---

### Swarmkit
#### Présentation

Swarmkit est un ensemble d'outil open-source qui permet de créer un cluster multi-noeuds.  
Cet outil fait parti intégrante de Docker.  

C'est un système qui fonctionne en mode haute disponibilité basé sur le protocole [Raft](https://github.com/docker/swarmkit/blob/master/design/raft.md)  
Ce protocole est robuste et permet une reconfiguration dynamique sans interruption du cluster.  
Il est utilisé dans plusieurs projets open-source comme etcd, zookeeper,...  

Swarmkit intègre egalement directement le Load-Balancing des services et les réseaux overlay.  


#### [Nomenclature](https://github.com/docker/swarmkit/blob/master/design/nomenclature.md)

- Un **cluster Swarm** est composé d'au moins **noeud**.  
- Un noeud est soit un **manager** soit un **worker**.
- **Les managers** s'occupent de la partie **Raft** et conservent les **journaux du Raft**.  
- Le cluster est commandé via l'**API** Swarmkit au travers des **managers**.  
- **Un seul** manager fait office de **leader**, les autres managers ne font que relayer les requêtes.  
- Les workers recoivent les instructions de la part des managers  
- Il est conseillé d'éxécuter le workload sur les workers, bien que les managers peuvent aussi s'en charger. 

![Swarm](/images/swarm-diagram.png?featherlight=false&width=40pc)


* Les managers exposent l'API de Swarm  
* On lance des **services** via l'API
* Un service est un objet defini par sont **état désiré** : une image, combien de replicas, dans quel réseau,...  
* Un service est composé de plusieurs **tasks** 
* Une **tasks** corresponds à un conteneur **assigné** à un noeud  
* Les **noeuds** connaissent leurs **tasks** et sont chargé de les démarrer ou les arrêter en conséquence.

![Services](/images/services-diagram.png?featherlight=false&width=30pc)
