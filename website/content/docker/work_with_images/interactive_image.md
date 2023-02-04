---
title: "Création Image Interactive"
date: 2020-06-11T23:10:12+02:00
weight: 2
draft: false
---

### Créer une image à partir d'un conteneur

Il est possible de créer une image partir d'un conteneur et de ses modifications.  
Meme si cette solution n'est pas la plus utilisée, elle peut être utilsée à des fins de tests ou de sauvegarde.

Reprenons notre exemple avec `figlet` pour créer une nouvelle image à partir du conteneur.
Pour cela nous allons:
- Lancer un conteneur avec une image de base de votre choix.
- Installer un programme manuellement dans le conteneur
- Puis utiliser les nouvelles commandes : `docker commit`, `docker tag` et `docker diff` 
- `docker diff` pour voir les changements effectués dans le conteneur.
- `docker commit` pour convertir le conteneur en nouvelle image
- `docker tag` pour renommer l'image.


{{% notice warning %}}
Essayez par vous même, sinon je reste disponible pour toutes questions.
{{% /notice %}}


{{% notice style="info" %}}
Dans le prochain chapitre, nous allons apprendre à automatiser le build avec un **Dockerfile**
{{% /notice %}}
