---
title: "Dans le Réseau"
date: 2020-06-12T23:23:40+02:00
weight: 2
draft: false
---

On peut lister les réseaux avec `docker network ls`

```bash
$ docker network ls
NETWORK ID          NAME                DRIVER              SCOPE
a5fa804dcca5        bridge              bridge              local
a5a200b4762b        host                host                local
b35f65ab844b        none                null                local
```

On peut considérer un réseau comme un Virtual Switch.  
Docker va lui assigner automatiquement un sous-réseau  puis une IP aux conteneurs associés.  
Les conteneurs peuvent faire partis de plusieurs réseaux à la fois.  
Les noms des conteneurs sont résolus via un serveur DNS embarqué dans le Docker daemon.  

Il existe aussi un driver multi-hôtes utilisé lors de la mise en cluster de plusieurs machines (un ***Cluster Swarm***)  
Ce driver, appelé ***overlay*** fonctionne au travers de lien VXLAN.
Nous reviendrons sur celui-ci un peu plus tard.

### Un réseau, deux conteneurs 

![Single Network Diagram](/images/bridge2.png?lightbox=false&width=40pc)  

Créer un réseau `devops`
```bash
$ docker network create devops
8a5841273868138b581a8c663e9a042f181a1a52c0028c21988ffd474c117610
```
Vous pouvez le voir avec `docker network ls`  

Maintenant, lancer un conteneur sur ce réseau et donnez lui un *nom* reconnaissable.  
```bash
$ docker run -d --name AppDev --net devops hashicorp/http-echo -text "Mon AppDev"
```

Maintenant, lancer un autre conteneur dans ce même réseau et lancer un ping vers votre premier conteneur `AppDev`  
```bash
$ docker run -ti --net devops alpine sh
/ # ping appdev
```  


![Magic](/images/magic.gif?lightbox=false&width=20pc)

---

On peut inspecter le réseau avec `docker inspect devops`  
```bash
$ docker inspect devops
[
    {
        "Name": "devops",
        "Id": "8be916360cbc400758d107e47e02a9890d37da0fe3cb0a3a11acde60173a03de",
        "Created": "2020-06-14T01:49:07.632816857Z",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": {},
            "Config": [
                {
                    "Subnet": "172.20.0.0/16"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "2496236a9109045a1cfb17cd237e84208fe2b3fee7b861e212aeaf7bce9bf61c": {
                "Name": "AppDev",
                "EndpointID": "19a945be9b13b373dc49c840c9871bfa60ed7bfba163c7a93e763b7f016102dc",
                "MacAddress": "02:42:ac:14:00:02",
                "IPv4Address": "172.20.0.2/16",
                "IPv6Address": ""
            }
        },
        "Options": {},
        "Labels": {}
    }
]
```

Dans mon cas on peut voir que `devops` à un sous réseau en ***172.20.0.0/16***  
Puis la définition de mon conteneur avec l'IP ***172.20.0.2/16***  

Maintenant sur la VM, lister les interfaces réseau  
```bash
$ ip a
[...]
262: br-8be916360cbc: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:f3:81:04:97 brd ff:ff:ff:ff:ff:ff
    inet 172.20.0.1/16 brd 172.20.255.255 scope global br-8be916360cbc
       valid_lft forever preferred_lft forever
    inet6 fe80::42:f3ff:fe81:497/64 scope link
       valid_lft forever preferred_lft forever
264: vethcbea7f9@if263: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-8be916360cbc state UP group default
    link/ether 96:56:cf:87:0d:3d brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet6 fe80::9456:cfff:fe87:d3d/64 scope link
       valid_lft forever preferred_lft forever
```

Vous pouvez voir les interfaces de la VM, le bridge docker0.  
Puis deux interfaces **br-8be916360cbc**, **vethcbea7f9@if263** qui sont le bridge du réseau `devops` et l'interface veth du conteneur coté VM.  

On peut voir ça aussi avec `brctl`
```bash
$ brctl show
bridge name	        bridge id		    STP enabled	    interfaces
br-8be916360cbc		8000.0242f3810497	no		        veth1eecb09
docker0		        8000.02422beae43c	no		
```

### On peut aller un peu plus loin
Créér un deuxième réseau `prod`  
Lancer un conteneur dans ce réseau `prod`
```bash
$ docker run -d --name AppProd hashicorp/http-echo -text "Production"
```

Obtenir l'IP de AppDev et AppProd
```bash
$ docker run --rm --net container:AppDev alpine ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
265: eth0@if266: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP
    link/ether 02:42:ac:14:00:02 brd ff:ff:ff:ff:ff:ff
    inet 172.20.0.2/16 brd 172.20.255.255 scope global eth0
       valid_lft forever preferred_lft forever

$ docker run --rm --net container:AppProd alpine ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
268: eth0@if269: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP
    link/ether 02:42:ac:18:00:02 brd ff:ff:ff:ff:ff:ff
    inet 172.24.0.2/16 brd 172.24.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

On a donc AppDev : 172.20.0.2/16 
et AppProd : 172.24.0.2/16

{{% notice warning %}}
Essayer de pinger AppProd à partir du *namespace réseau* de AppDev (`--net container:AppDev`) avec un conteneur alpine.  
Que se passe t-il ?
{{% /notice %}}

On a vu que Docker est lié au Kernel, nous allons très simplement connecter AppDev et AppProd sans passer par Docker.  
Nous allons créer une paire de Veth, puis connecter un bout au bridge `devops` et un autre dans le namespace du conteneur `AppProd`  


```bash
# On crée la paire de veth
$ sudo ip link add name int_hote type veth peer name int_conteneur
# On associe in_hote au bridge
$ sudo ip link set int_hote master br-8be916360cbc up
# On voit nos interfaces dans la VM
$ ip a | grep int
270: int_conteneur@int_hote: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000
271: int_hote@int_conteneur: <NO-CARRIER,BROADCAST,MULTICAST,UP,M-DOWN> mtu 1500 qdisc noqueue master br-8be916360cbc state LOWERLAYERDOWN group default qlen 1000
```


Il nous faut trouver le pid de `AppProd` pour associer l'autre veth à son network namespace
```bash
$ ps ax | grep 'Production'
 3146 ?        Ssl    0:00 /http-echo -text Production
```

Le PID est le **3146**
```bash
$ ip link set int_conteneur netns 3146
```


On va utiliser la commande `nsenter` pour se balader dans les namespaces.

```bash
$ nsenter -n -u -t 3146
root@69421ba25609:~# ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
268: eth0@if269: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:18:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.24.0.2/16 brd 172.24.255.255 scope global eth0
       valid_lft forever preferred_lft forever
270: int_conteneur@if271: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether 26:d7:1f:f9:fb:77 brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

Maintenant on configure l'interface dans le conteneur AppProd.

```bash
root@69421ba25609:~# ip link set int_conteneur name eth1 up
root@69421ba25609:~# ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
268: eth0@if269: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:18:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.24.0.2/16 brd 172.24.255.255 scope global eth0
       valid_lft forever preferred_lft forever
270: eth1@if271: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 26:d7:1f:f9:fb:77 brd ff:ff:ff:ff:ff:ff link-netnsid 0

#
# Rappel, le sous réseau devops est 172.20.0.0/16
# On va prendre un IP dans ce réseau : 172.20.0.100/16
#

root@69421ba25609:~# ip addr add 172.20.0.100/16 dev eth1
root@69421ba25609:~# ip route add default via 172.20.0.1
```

{{% notice warning %}}
Essayer maintenant à nouveau de pinger AppProd à partir de AppDev.  
Connectez vous au namespace avec nsenter pour jouer avec ;)
Que se passe t-il ?
{{% /notice %}}


{{% notice warning %}}
Supprimer maintenant les deux conteneurs.  
Observer les interfaces réseau au niveau de la VM.
{{% /notice %}}
