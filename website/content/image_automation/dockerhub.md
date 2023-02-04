---
title: "Le Docker Hub"
date: 2020-06-12T23:23:40+02:00
weight: 2
draft: false
---

### Le Nommage

Les images docker doivent respecter un certain schema de nommage pour être partager dans un ***registry***.  
Il y a 3 espaces de noms:

* Les images officielles  
`alpine`, `ubuntu`, `python`

Les images officielles sont selectionées par Docker.  
Elles sont directement dans l'espace de nom racine.  
Ce sont généralement des images de tiers reconnues.  
[https://hub.docker.com](https://hub.docker.com/search?q=&type=image&image_filter=store%2Cofficial)



* Les images d'utilisateurs (ou d'organisations)  
`zaggash/random`

L'espace de nom utilisateur contient les images des utilisateurs ou organisations.  
***zaggash*** est l'utilisateur dockerhub.  
***random*** est le nom de l'image.  

* Les images appartenant à un registry autre que le DockerHub  
`registry.mondns.fr:5000/mon_repo/mon_image`  

Ce nom est composé de l'adresse IP ( ou DNS) du registry et du port.  
Puis on retrouve la même logique que précédemment.

### Les tags
Vous avez peut être déjà remarqué mais les images ont un ***tag*** de version associé à leur nom, le tag par défaut est ***latest***  
```bash
$ docker pull zaggash/random
Using default tag: latest
latest: Pulling from zaggash/random
76df9210b28c: Pull complete
Digest: sha256:f1eb69bbb25b4f0b88d2edfe1d5837636c9e5ffaad0e96a11c047005a882f049
Status: Downloaded newer image for zaggash/random:latest
docker.io/zaggash/random:latest
```

Le tag defini une variante, la version d'une image.  

---

{{% notice warning %}}
Si vous n'avez pas de compte sur le DockerHub, je vous invite à en créer un, c'est gratuit >> [Inscription](https://hub.docker.com/signup)  
Essayer de pousser votre image créée précédemment, dans votre espace de nom avec `docker login` et `docker push`  
Vous devrez certainement la renommer avec la commande `docker tag` >> [Documentation Docker CLI](https://docs.docker.com/engine/reference/commandline/docker/)
{{% /notice %}}

---

### Le Hub

{{% notice tip %}}
Petite Pause  !  
On essaie de tous se retrouver pour une présentation de l'interface, et une session Questions/Réponses si besoin.
{{% /notice %}}

- Les images officielles, les images utilisateurs/organisations
- Les Tags
- Présentation de l'integration avec Github
- Builds automatisés
- Les Webhooks