---
title: "Alors, VM ou Conteneur ?"
menuTitle: ""
date: 2020-06-08T23:09:18+02:00
weight: 6
draft: false
---

La plupart du temps, les conteneurs tournent dans des VMs.  
Les applications profitent des bénéfices de la contenerisation et la flexibilité des VMs.  
Faire tourner des conteneurs dans une machine complétement physique ajoute des problématiques de scalabilitée.  
Il n'y a pas de vérité, tout est une question de besoin !

| VM | Conteneur |
|-----|------------
| Lourd, dans l'ordre du Giga |	Léger, dans l'ordre du Mega |
| Overhead de l'hyperviseur |	Performance native de l'hôte |
| Chaque VMs à son propre OS  |	Les conteneurs partagent l'OS de l'hôte |
| Virtualisation Hardware | Virtualisation de l'OS |
| Démarrage dans l'ordre de la minute | Démarrage de l'ordre de la milliseconde |
| Isolation complète, donc plus sécrisée | Isolation au niveau du processus, potentiellement moins sécurisée |


![docker_vm](/images/docker_stack.jpg?lightbox=false)