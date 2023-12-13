---
title: "Docker Engine"
date: 2020-06-09T02:38:40+02:00
draft: false
weight: 2
---

Le Docker Engine est divisé en plusieurs parties.

- ***dockerd***  (REST API, authentification, réseaux, stockage) : Fait appel à ***containerd***
- ***containerd*** (Gère la vie des conteneurs, push/pull les images)
- ***runc*** (Lance l'application du conteneur)
- ***containerd-shim*** (Par conteneur; permet de separer le processus et RunC) 

Plusieurs fonctionnalitées sont progressivement deleguées du ***Docker Engine*** à ***containerd***

![architecture](/images/engine_architecture.png?lightbox=false&width=50pc)

{{% notice style="info" %}}
Des exercices du TP permettrons de verifier cela après l'installation
{{% /notice %}}
