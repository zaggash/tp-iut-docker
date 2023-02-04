---
title: "Les Pilotes Réseau"
date: 2020-06-12T23:23:40+02:00
weight: 1
draft: false
---

Docker inclut plusieurs drivers Réseau que l'on peut choisir avec l'option `--net <driver>`
- bridge (par defaut)
- none
- host
- container

### Le *bridge*

Par defaut le conteneur obtient une interface virtuelle eth0 en plus de son interface de bouclage (127.0.0.1)  
Cette interface est fournie par une paire de *veth*.  

Elle est connectée au Bridge Docker appelé docker0 par defaut.  
Les adresses sont allouées dans un réseau privé interne 172.17.0.0/16 par défault.  

Le trafic sortant passe par une régle `iptables` MASQUERADE, puis le trafic entrant et naté par DNAT.  
Les régles sont automatiquement gérées par Docker.

### Le *null* driver

Pas grand chose à dire sur celui-là, Si ce n'est que le conteneur ne peut pas envoyer ni recevoir de trafic.  
Il obtient uniquement son adresse local *lo*

### Le *host* driver

Le conteneur executé avec ce driver voit et accède aux interfaces de l'hôte.  
Le trafic n'est donc pas naté et ne passe pas par une veth.  

Ce driver permet donc d'avoir les performances natives de la carte réseau.
Très pratique dans des applications sensibles à la latence (Voip, streaming, ...)

### Le driver *container*

Celui-ci est un peu spécial car il permet de réutiliser la stack réseau d'un autre conteneur.  
Les deux conteneurs partagent la même interface, IP, routes, ...  
Ils peuvent communiquer au travers de 127.0.0.1.  
