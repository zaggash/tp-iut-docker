---
title: "Travailler avec les conteneurs"
date: 2020-06-11T23:10:12+02:00
weight: 1
draft: false
---

### Hello World

Dans votre nouvel environnement, tapez la commande suivante:

```bash
$ docker run busybox echo hello world
hello world
```

- Nous avons utilisé une des plus simple et petite image: busybox
- busybox est souvent utilisé dans les systèmes embarqués.
- Nous avons lancé un simple processus et affiché ***hello world***
- La premiere fois que l'on lance un conteneur, l'image est chargée sur la machine, cela explique les lignes supplémentaires.


### Conteneur interactif

Lançons un conteneur un peu plus sympa

```bash
$ docker run -it ubuntu
root@ae1c076701b7:/#
```

- Nous venons de lancer un simple conteneur sous **ubuntu**
- `-it` est un raccourci pour `-i -t`.

    * `-i` nous connecte au *stdin* du conteneur 

    * `-t` nous donne un pseudo-terminal dans le conteneur

### Utiliser le conteneur

Essayez de lancer `figlet` dans notre conteneur
```bash
root@ae1c076701b7:/# figlet
bash: figlet: command not found
```
Nous avons besoin de l'installer
```bash
root@ae1c076701b7:/# apt-get update && apt-get install figlet -y
[...]
root@ae1c076701b7:/# figlet hello-world
 _          _ _                               _     _
| |__   ___| | | ___      __      _____  _ __| | __| |
| '_ \ / _ \ | |/ _ \ ____\ \ /\ / / _ \| '__| |/ _` |
| | | |  __/ | | (_) |_____\ V  V / (_) | |  | | (_| |
|_| |_|\___|_|_|\___/       \_/\_/ \___/|_|  |_|\__,_|

```

### Conteneurs et VMs

Sortir du conteneur avec `exit` et lancer la commande à nouveau `figlet hello-world`, cela fonctionne-t-il ?

- Nous avons lancé un conteneur **ubuntu** sur une machine hôte linux.
- Ils ont des paquets differents et sont independants, même si l'OS est identique..

### Mais où est mon conteneur ?

Notre conteneur à maintenant un statut **stopped**.
Il est toujours présent sur le disque de la machine mais tous les processus sont arrétés.

Nous pouvons lancer un nouveau conteneur, et lancer `figlet` à nouveau
```bash
root@b6cb64d4bddc:/# figlet
bash: figlet: command not found
```
Nous avons lancé un tout nouveau conteneur avec la même image de base **ubuntu** et `figlet` n'est pas installé.  

Il est possible réutiliser un conteneur qui à été arrêté mais ce n'est pas la philosophie des conteneurs.  
Voyez un conteneur comme un processus à ***usage unique***, si l'on veut réutiliser un conteneur personnalisé, on crée une ***image***  
Cela permet de garder le coté immuable d'un conteneur et de pouvoir le partager de facon fiable.

{{% notice style="info" %}}
Nous verrons dans un prochain chapitre comment personnaliser une image !
{{% /notice %}}
