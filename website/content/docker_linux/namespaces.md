---
title: "Les Namespaces"
date: 2020-06-14T11:39:32+02:00
draft: false
weight: 1
---


Les Namespaces jouent un rôle important dans les conteneurs.  
Ils permettent de placer les conteneurs dans leur propre vu du système et limitent ce que l'on peut faire et voir.  
Il y a different type de namespaces:
* pid
* net
* mnt
* uts
* ipc
* user

Les namespaces font partie du Kernel et sont actifs dès le démarrage de l'OS.  
Même sans l'utilisation des conteneurs, il y a au moins un namespace de chaque type qui contient tous les processus du système.  

Ils sont donc liés au système et créés grâce à deux Syscall principaux : `clone()` et `unshare()`  
La commande `unshare` permet de faire appel à ces Syscall.  

`nsenter` fait appel au syscall `setns()` et nous permet d'inspecter les namespaces.  

Quand le dernier processus d'un namespace s'arrête, le namespace est detruit et toutes les ressources qui vont avec.

On les retrouve décrit par des fichiers dans `/proc/<PID>/ns`

{{% notice warning %}}
Vérifier dans votre VM les namespaces utilisés par init ( PID 1) et dockerd (`pidof dockerd`)
{{% /notice %}}


### Créer son premier namespace
#### net
{{% notice tip %}}
Le ***netns*** sera vu dans la partie suivante.
{{% /notice %}}

#### UTS
Nous allons utiliser le namespace *uts*.  
Il permet concrétement de choisir le hostname du conteneur.  

```bash
// Dans la VM
$ hostname
apinon-droplet-1
$ sudo unshare --uts /bin/bash
// Ici on est dans le namespace
// hostname my.name.is.bob
# hostname
my_name_is_bob
```

{{% notice tip %}}
Ouvrir un nouveau terminal et vérifier le hostname de la VM.
{{% /notice %}}

On peut quitter le namespace avec ***ctrl+d*** ou ***exit***  

#### mnt
On peut aussi isoler les points de montage.  
Ouvrir deux terminaux sur la VM.

```bash
// Terminal 1 (dans le namespace)
$ sudo unshare --mount /bin/bash
$ mount -t tmpfs none /tmp
# ls -l /tmp
```

```bash
// Terminal 2 (dans la VM)
$ ls -l /tmp
```

Nous avons monté un point de montage privé dans notre namespace.

#### pid
Les processus avec un *PID namespace* voient seulement les processus dans le même *PID namespace*.  
Chaque *PID namespace* à sa propre arborescence (à partir de 1)   
Si le PID 1 se termine, alors le namespace est terminé (sur Linux, si on kill le PID 1, on a un Kernel Panic)

```bash
// On entre dans notre namespace
$ sudo unshare --pid --fork /bin/bash
# ps aux
```

{{% notice info %}}
Que se passe t-il ?
{{% /notice %}}


Nous avons créé un *PID namespace*, mais Linux se base sur le point de montage /proc pour afficher les processus.  
Notre *PID namespace* à donc encore accès au PID de la VM, même s'il ne peut plus intéragir avec.  

```bash
// On entre dans notre namespace
$ sudo unshare --pid --fork /bin/bash
# pidof dockerd
# kill -9 $(pidof dockerd)
bash: kill: (7807) - No such process
```

Pour contourner cela, la command unshare fournit l'option `--mount-proc`  
```bash
// On entre dans notre namespace
$ sudo unshare --pid --fork --mount-proc /bin/bash
# ps aux
```

{{% notice tip %}}
Il n'est pas obligatoire de comprendre tout ce qui suit, mais une explication s'impose.
Vous avez peut être remarqué le ***--fork***  
C'est une complexité due au fonctionnement du syscall `unshare()`  qui `exec()` le processus en argument.  
Si on ne fork pas le processus qui lance le syscall, celui-ci va lancer le namespace puis se terminer dans l'OS, ce qui va donc terminer le namespace.  
En utilisant `--fork`, `unshare` va dupliquer le processus après avoir créé le *PID namespace*. Puis lancer `/bin/bash` dans le nouveau processus.
{{% /notice %}}

#### user

Le ***user namespace*** permet de séparer les UID/GID entre l'hôte et le namespace.  
Cela permet d'être root dans le namespace avec un utilisateur standard de l'hôte.  

```bash
(Dans la VM) $ id
uid=1000(alexxx) gid=1000(alexxx) groups=1000(alexxx)

// Notez que `unshare` est lancé sans `sudo` //
(Dans la VM) $ unshare --user /bin/bash
(Dans le NS) $ id
id=65534(nobody) gid=65534(nogroup) groups=65534(nogroup)
(Dans le NS) $ exit

(Dans la VM) $ unshare --user -r /bin/bash
(Dans le NS) # id
uid=0(root) gid=0(root) groups=0(root),65534(nobody)
```

La séparation des UID dans docker complique le partage de fichier entre conteneurs.