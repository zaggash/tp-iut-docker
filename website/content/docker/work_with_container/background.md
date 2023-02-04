---
title: "Conteneurs en arrière-plan"
date: 2020-06-11T23:10:12+02:00
weight: 2
draft: false
---

### Un conteneur non-interactif

Nous allons lancer un conteneur tout simple qui affiche des nombres aléatoires chaque seconde.
```bash
$ docker run zaggash/random
23008
19194
17802
16235
8189
667
```

- Ce conteneur continuera de s'executer indéfiniement.
- Un `ctrl+c` permet de l'arrêter.

### en arrière-plan

Nous pouvons lancer ce conteneur de la meme manière mais en arrière plan avec l'option `-d`
```bash
$ docker run -d zaggash/random
a5a20f1f8897d6b7a7644a322141ad74a3c21e28530b11cf10ef583ba539e55c
```

On ne voit plus la sortie standard du conteneur, mais le daemon `dockerd` collecte toujours stdin/stdout du conteneur et les écrit dans un fichier de log.  
La chaîne de caractères est l'ID complet de notre conteneur.

{{% notice tip %}}
Petit rappel du chapître précedent.  
On peut voir le processus **dockerd**, PID ***7807*** qui contient la socket de containerd en argument.  
Puis notre processus enfant ***8247***, executé par **runc**, PID ***8217*** lui même demarré par **containerd**, PID ***2656***
{{% /notice %}}
```bash
$ ps fxa | grep dockerd -A 3  
[...]
2656 ?        Ssl   42:56 /usr/bin/containerd
 8217 ?        Sl     0:00  \_ containerd-shim -namespace moby -workdir /var/lib/containerd/io.containerd.runtime.v1.linux/moby/027b6c72b74f510b3403a3cd246e3c8c802034960cb82bf45dad8278f0e21d6c -address /run/containerd/containerd.sock -containerd-binary /usr/bin/containerd -runtime-root /var/run/docker/runtime-runc
 8247 ?        Ss     0:00      \_ /bin/sh -c while echo $RANDOM;do sleep 1;done
--
 7807 ?        Ssl    1:03 /usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
 [...]
```
Un processus conteneurisé est un processus system comme un autre.
On peut le voir avec un `ps`
on peut faire l'analyser avec un `strace`, `lsof`,...


### Plus de commandes

#### Verifier l'état de notre conteneur
Verifier les conteneurs en cours d'execution avec la commande `docker ps`
```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS               NAMES
a5a20f1f8897        zaggash/random      "/bin/sh -c 'while e…"   5 minutes ago       Up 5 minutes                            crazy_khorana
```

L'API nous retourne:
- l'ID tronqué de notre conteneur
- l'image utilisé par le conteneur
- l'etat du conteneur (Up)
- un nom généré aléatoirement

{{% notice tip %}}
Lancer 2/3 conteneurs supplémentaires et verifier que `docker ps` nous retourne tous les conteneurs.
{{% /notice %}}

#### Quelques commandes utiles

##### 1 - Voir les ID des conteneurs
Si vous voulez lister seulement les IDs des conteneurs, l'option `-q` renvoi une colonne sans les entêtes.
Cet argument est particulièrement utile pour le scripting.

```bash
docker ps -q
eaf444d185be
aaeb4643ae39
a5a20f1f8897
```

##### 2 - Voir les logs des conteneurs
Docker garde les logs stderr et stdout de chaque conteneur.
Verifions ça avec notre premier conteneur
```bash
$ docker logs a5a
[...]
5412
3585
13237
20376
29438
```

Docker nous retourne la totalité des logs du conteneur.

Pour eviter d'être polluer par tout ça, nous pouvons utiliser l'argument `--tail` et extraire les dernieres lignes
```bash
$ docker logs --tail 5 a5a
12893
32068
25356
571
16054
```

Pour voir les logs en temps réel, on peut utiliser l'argument `-f`
```bash
$ docker logs --tail 5  -f  a5a
6644
28412
3315
22610
27692
3136
9107
20481
^C
```

Nous voyons les 5 dernières lignes de logs puis l'affichage en temps réél.
`ctrl+c` pour quitter.

##### 3 - Arrêter un conteneur
Nous pouvons arrêter un conteneur de deux manières.  
- avec un `kill`
- avec un `stop`

Le `kill` va arrêter le conteneur de manière immediate avec un signal `KILL`.  
Le `stop` envoie un signal `TERM` et peut être intercepté par l'application pour terminer le processus.  
Après **10s** si le processus n'est pas arrêté, Docker envoi un `KILL`

On peut tester ça avec notre conteneur
```bash
$ docker stop  a5a
a5a
```

Nous voyons bien que le terminal nous rend la main après une dizaine de seconde.
- Docker envoi un TERM
- Le conteneur ne réagit pas à ce signel, c'est une simple boucle en Shell.
- **10s** après, le conteneur est toujours actif, alors Docker envoi un KILL et termine le conteneur.

Maintenant, on va arrêter les conteneurs restant avec un kill en utilisant les commandes vues précédemment
```bash
$ docker kill $(docker ps -q)
eaf444d185be
aaeb4643ae39
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
```
Nous voyons ici que les conteneurs ont été arrêtés immediatement.


```bash
$ docker ps -a
docker ps -a
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                           PORTS               NAMES
eaf444d185be        zaggash/random      "/bin/sh -c 'while e…"   29 minutes ago      Exited (137) 3 minutes ago                           friendly_chatelet
aaeb4643ae39        zaggash/random      "/bin/sh -c 'while e…"   29 minutes ago      Exited (137) 3 minutes ago                           recursing_dirac
a5a20f1f8897        zaggash/random      "/bin/sh -c 'while e…"   44 minutes ago      Exited (137) 8 minutes ago                           crazy_khorana
```