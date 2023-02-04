---
title: "Installer docker-compose"
date: 2020-06-14T18:08:25+02:00
draft: false
weight: 1
---

Bien que nous puissions installer Docker Compose à partir des repos officiels Ubuntu, cette version n'est pas très à jour.  
Nous allons donc installer Docker Compose à partir du [repo github de Docker Compose](https://github.com/docker/compose).  
Le site de Docker propose [une documentation pour l\'installation](https://docs.docker.com/compose/install/#install-compose-on-linux-systems).  
```bash
$ latest=$(curl -sL "https://api.github.com/repos/docker/compose/releases/latest" |\jq -r '.tag_name')  
$ sudo curl -L "https://github.com/docker/compose/releases/download/$latest/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose  
$ sudo chmod +x /usr/local/bin/docker-compose  
$ docker-compose --version
```
