---
title: "Travailler avec les images"
date: 2020-06-11T23:10:12+02:00
weight: 2
draft: false
---

### Qu'est ce qu'une image ?

Une image est un ensemble de **fichiers** et de **metadata**.  
- Les fichiers constituent le FileSystem de notre conteneur.
- les metadata peuvent être de différentes formes
    * le créateur de l'image
    * les variables d'environnement
    * les commandes à executer 

Les images sont en fait une superposition de couches appelées **layers**  
Chaque layer **ajoute**, **modifie** ou **supprime** un fichier et/ou une metadata.  
Les images peuvent partager des layers, ce qui permet d'optimiser l'utilisation de l'espace disque, les transferts réseaux

![Image Layers](/images/image_layers.png?lightbox=false&width=25pc)