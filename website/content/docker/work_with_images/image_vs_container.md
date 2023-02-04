---
title: "Image vs Conteneur"
date: 2020-06-11T23:10:12+02:00
weight: 1
draft: false
---

### Une image n'est pas un conteneur !

Une image est un système de fichiers en ***lecture seule***  
Un conteneur est processus qui s'execute dans une ***copie*** de ce système de fichiers.

![Containers Layers](/images/container-layers.jpg?featherlight=false&width=28pc)


Pour accélérer le démarrage et optimiser les accès disque, plutôt que de copier l'image entière, on utilise ici du Copy-On-Write.  
Plusieurs conteneurs peuvent donc utiliser la même image sans dupliquer les données.

![Shared Layers](/images/image_layers_sharing.png?featherlight=false&height=10pc)

Si une image est en **lecture seule**, on ne modifie pas une image, on en crée une **nouvelle**.

Nous avons utilisé l'image ***ubuntu*** tout a l'heure.  
Nous pouvons inspecter ses layers de la manière suivante
```bash
$ docker image history ubuntu:latest
IMAGE               CREATED             CREATED BY                                      SIZE                COMMENT
1d622ef86b13        7 weeks ago         /bin/sh -c #(nop)  CMD ["/bin/bash"]            0B
<missing>           7 weeks ago         /bin/sh -c mkdir -p /run/systemd && echo 'do…   7B
<missing>           7 weeks ago         /bin/sh -c set -xe   && echo '#!/bin/sh' > /…   811B
<missing>           7 weeks ago         /bin/sh -c [ -z "$(apt-get indextargets)" ]     1.01MB
<missing>           7 weeks ago         /bin/sh -c #(nop) ADD file:a58c8b447951f9e30…   72.8MB
```

Les données relatives aux images et aux conteneurs sont stockées dans: `/var/lib/docker/`  
