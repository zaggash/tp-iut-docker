---
title: "Installer Docker"
menuTitle: ""
date: 2020-06-11T21:09:18+02:00
weight: 3
draft: false
---

Dans cette partie, nous allons prendre la main sur les VMs et installer Docker qui nous servira tout au long de la suite du TP.

### Connection à la VM

Dans un premier temps, se connecter en SSH à la VM.  
Afin de préparer l'environnement pour la suite, l'installation devra se faire sur les 3 VMs.

```bash
ssh [-i private_key] user@hostname
```

### Mettre à jour l'OS

Afin d'être dans les meilleurs conditions possible et que nos machines soient identiques, commençons par mettre à jour les VMs.
```bash
$ sudo apt-get update
$ sudo apt-get upgrade -y
$ sync && sync && sudo reboot
```
Puis procéder à l'installation des paquets qui nous serviront par la suite.
```bash
$ sudo apt-get install -y bridge-utils jq git httping
```

### Installer Docker

La procédure d'installation est bien detaillée sur le site de Docker.  
[Installer Docker sur Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

Afin d'eviter d'atteindre [la limite de telechargements](https://docs.docker.com/docker-hub/download-rate-limit/) de certaines images du DockerHub, il nous faut ajouter un cache.  
Modifier le fichier /etc/docker/daemon.json et ajouter la valeur `registry-mirrors`, afin de rendre le changement permanent.  

```yaml  
{
  "registry-mirrors": ["https://<my-docker-mirror-host>"]
}
```  

Enregistrer le ficher et redemarrer le daemon Docker afin d'appliquer le changement.  


TLDR:  
```bash  
$ sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common

$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
$ sudo apt-key fingerprint 0EBFCD88

$ sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

$ sudo apt-get update
$ sudo apt-get install docker-ce docker-ce-cli containerd.io
```

Verifier que le daemon est bien lancé

```bash
$ sudo systemctl status docker

docker.service - Docker Application Container Engine
   Loaded: loaded (/lib/systemd/system/docker.service; enabled; vendor preset: enabled)
   Active: active (running) since Thu 2020-06-11 20:29:54 UTC; 9min ago
     Docs: https://docs.docker.com
 Main PID: 7807 (dockerd)
    Tasks: 30

[...]
```

### Lancer un premier conteneur

{{% notice info %}}
L'accès à docker est considéré comme un accès root sur le serveur.  
C'est pourquoi l'utilisateur "docker" est équivalent à "root".  
{{% /notice %}}

Pour simplifier l'execution des commandes et éviter de taper "sudo" devant chaque commande, nous allons ajouter notre utilisateur au groupe "docker".
```bash
$ sudo usermod -a -G docker user
```

[ relancer la connection ssh ]


```bash
$ docker run --rm hello-world
Hello from Docker!
[...]
```

Voilà vous avez executé un premier conteneur...
