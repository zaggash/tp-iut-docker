---
title: "Architecture"
menuTitle: ""
date: 2020-06-08T23:09:18+02:00
weight: 2
draft: false
---

Lorsque l'on installe **Docker**, on installe plusieurs composants.  
Il y a le Docker Engine et la CLI.

- Le Docker Engine est un demon qui tourne en arrière plan
- Les interactions avec ce daemon se font via une API REST par un Socket.
- Sous Linux, ce socket est un socket Unix : `/var/run/docker/sock`
- Il est également possible d'utiliser un Socket TCP avec authentification TLS.
- Le Docker CLI communique avec le daemon via cette Socket.

![architecture](/images/docker-engine-architecture.svg?featherlight=false&width=50pc)