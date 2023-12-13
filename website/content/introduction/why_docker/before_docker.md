---
title: "Avant Docker"
menuTitle: ""
date: 2020-06-08T23:09:18+02:00
weight: 4
draft: false
---

Les applications étaient principalement toutes installées sur des Machines Virtuelles.  
Certaines fois plusieurs applications partagent la même VM avec ses propres librairies, dépendances, fichiers de configurations...

Les installations se sont ensuite automatisées avec Ansible, Chef, Puppet,... mais il est très facile de modifier un fichier directement sur la machine sans changer le template.  
Ce qui rend les environnements certaines fois non fiable.  

Les Ops et Dev n'ont pas forcement une manière simple de partager les applications.  
Les environnements varient ce qui crée des lenteurs et des frictions entre Dev et Ops.

![DevVsOps](/images/meme_dev_vs_ops.jpg?lightbox=false&width=40pc)