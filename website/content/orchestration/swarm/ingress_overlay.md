---
title: "Le réseau Ingress Overlay"
date: 2020-06-15T21:37:57+02:00
draft: false
weight: 3
---

{{% notice info %}}
Pour commencer cette partie, nous allons supprimer le service `demo`  
`docker service rm demo`  
{{% /notice %}}

### Swarm et les Overlay

Nous venons de déployer une application sur le cluster et l'on a vu que le port du service est disponible sur tous les noeuds.  
Cela est possible grâce au réseau par défaut de Swarm, appelé `ingress`.  
```bash
$ docker network ls
NETWORK ID          NAME                DRIVER              SCOPE
6b141a0943ca        bridge              bridge              local
bfc621566968        docker_gwbridge     bridge              local
6dbb4bea0e35        host                host                local
1b6ek4sxqg9g        ingress             overlay             swarm
797221e77f12        none                null                local
```
C'est un réseau overlay installé de base, et nécessaire pour les flux entrant.  

Nous pouvons de la même manière que les réseaux `bridge` qui ont un scope local, créer un réseau overlay qui à un scope au niveau du cluster.  
```bash
$ docker network create --driver overlay --subnet 10.10.10.0/24 mon-overlay-demo
```
Puis exécuter un serveur web simple exposé en dehors du cluster sur le port 8080.  
Ce service aura 3 réplicas et sera attaché à notre overlay `mon-overlay-demo`  
```bash
$ docker service create --name webapp --replicas=3 --network my-overlay-network -p 8080:80 zaggash/demo-webapp
```  

Relever l'ID du conteneur qui tourne sur notre noeud actuelle normalement `node1`
```bash
$ docker ps
```

Puis on entre dans le network namespace du conteneur pour afficher les interfaces.
```bash
$ sudo nsenter -n -t $(pidof -s nginx)
# ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
59: eth0@if60: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default
    link/ether 02:42:0a:00:00:16 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.0.0.22/24 brd 10.0.0.255 scope global eth0
       valid_lft forever preferred_lft forever
61: eth2@if62: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:12:00:06 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet 172.18.0.6/16 brd 172.18.255.255 scope global eth2
       valid_lft forever preferred_lft forever
63: eth1@if64: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default
    link/ether 02:42:0a:0a:0a:18 brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet 10.10.10.24/24 brd 10.10.10.255 scope global eth1
       valid_lft forever preferred_lft forever
```

On voit qu'il y en a 3, au lieu de une comme lorsque l'on lance un conteneur hors Swarm.  

Le conteneur est connecté à mon `mon-overlay-demo` au travers de eth1, comme on peux le voir avec l'IP.  
Les autres interfaces sont connectées à d'autres réseaux. 
eth0 est le `ingress` car nous exposons un port vers l'extérieur.
eth2 est le `docker_gwbridge`, le bridge local qui permet au conteneur de sortir du cluster.

```bash
$ docker network inspect ingress | grep Subnet
                    "Subnet": "10.0.0.0/24",
$ docker network inspect docker_gwbridge | grep Subnet
                    "Subnet": "172.18.0.0/16",
```  

### Les Overlays
Les réseaux overlay créent un sous réseau qui peut être utilisé par les conteneurs entre plusieurs noeuds dans le cluster.  
Les conteneurs situés sur des noeud différents peuvent échanger des paquets sur ce réseau si ils sont attaché à celui-ci.  

Par exemple, pour notre `webapp`, on voit qu'il y a un conteneur qui tourne sur chaque hôte dans notre cluster.
On le vérifie:  
```bash
$ docker service ps webapp
ID                  NAME                IMAGE                        NODE                DESIRED STATE       CURRENT STATE            ERROR               PORTS
9yrr2kdwc6t5        webapp.1            zaggash/demo-webapp:latest   node1               Running             Running 37 minutes ago
4qyritdeuwhx        webapp.2            zaggash/demo-webapp:latest   node3               Running             Running 36 minutes ago
eiqh6znlcvus        webapp.3            zaggash/demo-webapp:latest   node2               Running             Running 36 minutes ago
```  

Se connecter maintenant sur le `node2` et essayé de ping le conteneur qui est sur le `node1`  
```bash
(node2) | $ nsenter -n -t $(pidof -s nginx)
(node2) | # ping 10.10.10.24
PING 10.10.10.24 (10.10.10.24) 56(84) bytes of data.
64 bytes from 10.10.10.24: icmp_seq=1 ttl=64 time=0.505 ms
64 bytes from 10.10.10.24: icmp_seq=2 ttl=64 time=0.373 ms
64 bytes from 10.10.10.24: icmp_seq=3 ttl=64 time=0.485 ms
```


### VXLAN  

Les réseaux overlay de Docker utilisent la technologie VXLAN qui encapsule les trames ethernet (couche 2 du modèle OSI), dans un datagramme UDP (couche 4).  
Ceci permet d’étendre un réseau de couche 2 au dessus de réseaux routés. 
Les membres de se réseau virtuel peuvent se voir comme s'ils étaient connecté sur un switch.  
On identifie un réseau VXLAN par son identifiant VNI (VXLAN Network Identifier).  
Celle-ci est codée sur 24 bits, ce qui donne 16777216 possibilités, bien plus intéressant que la limite de 4096 induite par les VLANs.  

On peut le voir en prenant une trace sur les noeuds qui font partis de l'overlay.  
Regardons la capture du ping entre le conteneur de `node2` vers `node1`
```bash
(node2) | $ nsenter -n -t $(pidof -s nginx)
(node2) | # ping 10.10.10.24


(node1) | $ sudo tcpdump -i ens160 udp and port 4789
[sudo] password for user:
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on ens160, link-type EN10MB (Ethernet), capture size 262144 bytes
19:58:03.259691 IP 10.59.72.7.38266 > node1.4789: VXLAN, flags [I] (0x08), vni 4097
IP 10.10.10.26 > 10.10.10.24: ICMP echo request, id 25411, seq 36, length 64
19:58:03.259756 IP node1.59501 > 10.59.72.7.4789: VXLAN, flags [I] (0x08), vni 4097
IP 10.10.10.24 > 10.10.10.26: ICMP echo reply, id 25411, seq 36, length 64
```  
On peut voir dans les trames ci-dessus, que le premier est le paquet du tunnel VXLAN UDP entre les hôtes dans le port 4789.  
Et à l'intérieur, on voit le paquet ICMP entre les conteneurs.  

![vxlan](/images/vxlan.png?featherlight=false&width=55pc)  


### Encryption
Le trafic que l'on a vu ci-dessus montre que si l'on peut voir les paquets entre les noeuds, on peut voir le trafic entre les conteneurs qui passe dans l'overlay.  
C'est pourquoi Docker a ajouté une option qui permet de crypter avec IPsec le tunnel VXLAN.  
Pour cela, il faut ajouter `--opt encrypted` lors de la création du réseau.  

Répétons les étapes précédentes en utilisant un overlay crypté.

```bash
(node1) | $ docker service rm webapp
(node1) | $ docker network rm mon-overlay-demo
(node1) | $ docker network create --driver overlay --opt encrypted --subnet 10.20.20.0/24 mon-overlay-ipsec
(node1) | $ docker service create --name webapp --replicas=3 --network mon-overlay-ipsec -p 8080:80 zaggash/demo-webapp
(node1) | $ docker ps 
CONTAINER ID        IMAGE                        COMMAND                  CREATED             STATUS              PORTS               NAMES
1efc497c5983        zaggash/demo-webapp:latest   "/docker-entrypoint.…"   17 seconds ago      Up 13 seconds       80/tcp              webapp.1.ptfs32hrkcom2nu7syry31bwb

(node1) | $ docker inspect 1efc497c5983 | grep IPv4Address
                        "IPv4Address": "10.0.0.26"
                        "IPv4Address": "10.20.20.3"

(node1) | $ sudo nsenter -n -t $(pidof -s nginx)
(node1) | # ping 10.20.20.4
PING 10.20.20.4 (10.20.20.4) 56(84) bytes of data.
64 bytes from 10.20.20.4: icmp_seq=1 ttl=64 time=0.503 ms
64 bytes from 10.20.20.4: icmp_seq=2 ttl=64 time=0.412 ms

(node1) | $ sudo tcpdump -i ens160 esp
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on ens160, link-type EN10MB (Ethernet), capture size 262144 bytes
20:22:42.338614 IP node1 > 10.59.72.7: ESP(spi=0x1916910d,seq=0x19), length 140
20:22:42.338976 IP 10.59.72.7 > node1: ESP(spi=0x01fcdf39,seq=0x19), length 140
20:22:43.349513 IP node1 > 10.59.72.7: ESP(spi=0x1916910d,seq=0x1a), length 140
20:22:43.349913 IP 10.59.72.7 > node1: ESP(spi=0x01fcdf39,seq=0x1a), length 140
```

### Inspecter un réseau Overlay  

De la même manière que les réseaux `bridge`, Docker créé une interface bridge pour chaque `overlay`.  
Ce bridge connecte les interfaces virtuelles du tunnel pour établir les connections du tunnel VXLAN entre les hôtes.  
Cependant, ces bridges et interfaces de tunnel VXLAN ne sont pas créés directement sur l'hôte.  
Ils sont dans un conteneur séparé que Docker lance pour chaque réseau overlay.  
Pour inspecter ces interfaces, nous devons utiliser nsenter pour accèder à leur namespace. 


![vxlan_vtep](/images/vtep_vxlan.jpg?featherlight=false&width=40pc)  


Déjà voyons les interfaces de notre conteneur, nous en avons des nouveau depuis le test du tunnel IPsec:
```bash
$ sudo nsenter -n -t $(pidof -s nginx) ifconfig
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
68: eth0@if69: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default
    link/ether 02:42:0a:00:00:1a brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 10.0.0.26/24 brd 10.0.0.255 scope global eth0
       valid_lft forever preferred_lft forever
70: eth2@if71: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:12:00:03 brd ff:ff:ff:ff:ff:ff link-netnsid 2
    inet 172.18.0.3/16 brd 172.18.255.255 scope global eth2
       valid_lft forever preferred_lft forever
72: eth1@if73: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue state UP group default
    link/ether 02:42:0a:14:14:03 brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet 10.20.20.3/24 brd 10.20.20.255 scope global eth1
       valid_lft forever preferred_lft forever
```

Voyons le PeerID de la veth eth1 lié à notre overlay.
```bash
$ sudo nsenter -n -t $(pidof -s nginx) ethtool -S eth1
NIC statistics:
     peer_ifindex: 73
```

On cherche du coup maintenant la veth avec l'index 73, elle doit être dans le namespace de l'overlay.  

```bash
$ docker network ls | grep mon-overlay-ipsec
o2v3e4cf5fro        mon-overlay-ipsec   overlay             swarm

$ sudo ls -l /run/docker/netns/
total 0
[...]]
-r--r--r-- 1 root root 0 Jun 16 20:16 1-o2v3e4cf5f
[...]


$ sudo nsenter --net=/run/docker/netns/1-o2v3e4cf5f ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue state UP group default
    link/ether be:86:9b:82:98:53 brd ff:ff:ff:ff:ff:ff
    inet 10.20.20.1/24 brd 10.20.20.255 scope global br0
       valid_lft forever preferred_lft forever
65: vxlan0@if65: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UNKNOWN group default
    link/ether e2:fb:73:9d:d7:a2 brd ff:ff:ff:ff:ff:ff link-netnsid 0
67: veth0@if66: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UP group default
    link/ether be:86:9b:82:98:53 brd ff:ff:ff:ff:ff:ff link-netnsid 1
73: veth1@if72: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UP group default
    link/ether ea:86:89:7a:9e:f2 brd ff:ff:ff:ff:ff:ff link-netnsid 2
```
On voit ici notre interface veth avec l'index 73, il s'agit de veth1.  
Et nous voyons aussi notre interface VXLAN, vxlan0.  
veth0 est l'interface du namespace de la VIP du service.

On peut voir l'ID de notre VXLAN avec la commande suivante, ici 4098
```bash
 $ sudo nsenter --net=/run/docker/netns/1-o2v3e4cf5f  ip -d link show vxlan0
 65: vxlan0@if65: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UNKNOWN mode DEFAULT group default
    link/ether e2:fb:73:9d:d7:a2 brd ff:ff:ff:ff:ff:ff link-netnsid 0 promiscuity 1
    vxlan id 4098 srcport 0 0 dstport 4789 proxy l2miss l3miss ttl inherit ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrx
```

Pour finir, lancer une capture sur l'interface virtuelle veth1 va nous montrer le trafic qui quitte le conteneur.  
```bash
$ sudo nsenter --net=/run/docker/netns/1-o2v3e4cf5f tcpdump -i veth1 icmp
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on veth1, link-type EN10MB (Ethernet), capture size 262144 bytes
23:02:39.989473 IP 10.20.20.3 > 10.20.20.4: ICMP echo request, id 799, seq 61, length 64
23:02:39.989945 IP 10.20.20.4 > 10.20.20.3: ICMP echo reply, id 799, seq 61, length 64
23:02:41.013488 IP 10.20.20.3 > 10.20.20.4: ICMP echo request, id 799, seq 62, length 64
23:02:41.013979 IP 10.20.20.4 > 10.20.20.3: ICMP echo reply, id 799, seq 62, length 64
23:02:42.037832 IP 10.20.20.3 > 10.20.20.4: ICMP echo request, id 799, seq 63, length 64
23:02:42.038311 IP 10.20.20.4 > 10.20.20.3: ICMP echo reply, id 799, seq 63, length 64
```


