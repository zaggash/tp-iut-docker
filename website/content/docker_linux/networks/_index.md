---
title: "Les Réseaux"
date: 2020-06-12T23:23:40+02:00
weight: 2
draft: false
---

### Le serveur Nginx

Pour avoir accès au service web de nginx il va falloir exposer son port.
Lancer l'image **nginx** du Dockerhub qui contient un serveur web basique.

```bash
$ docker run -d -p 8080:80 nginx
Unable to find image 'nginx:latest' locally
latest: Pulling from library/nginx
8559a31e96f4: Pull complete
8d69e59170f7: Pull complete
3f9f1ec1d262: Pull complete
d1f5ff4f210d: Pull complete
1e22bfa8652e: Pull complete
Digest: sha256:21f32f6c08406306d822a0e6e8b7dc81f53f336570e852e25fbe1e3e3d0d0133
Status: Downloaded newer image for nginx:latest
8fe2d550ac86b4bb6f544710f4f65ffcc0f4728a2cf52f5b8455e0112b284ce0
```

**-p \<ip\>:8080:80** Ici on expose le port 80 du conteneur nginx sur le port 8080 de la VM  
Par defaut, le port de la VM écoute sur 0.0.0.0

```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                  NAMES
b1fa3fc64a2f        nginx               "/docker-entrypoint.…"   3 seconds ago       Up 2 seconds        0.0.0.0:8080->80/tcp   stupefied_shaw
```
Sur l'output ci-dessus, ou voit bien la colonne **PORTS** qui recapitule les ports ouverts.  
On lance un curl pour verifier que l'on a bien un HTTP 200
```bash
$ curl -sLI 127.0.0.1:8080
HTTP/1.1 200 OK
Server: nginx/1.19.0
Date: Sat, 13 Jun 2020 23:04:53 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 26 May 2020 15:00:20 GMT
Connection: keep-alive
ETag: "5ecd2f04-264"
Accept-Ranges: bytes
```

{{% notice warning %}}
Essayer de lancer un autre conteneur nginx qui écoute sur le port 8080 uniquement sur localhost.
Que se passe t - il ?
{{% /notice %}}

{{% notice warning %}}
Supprimer maintenant tous les conteneurs.  
Essayer de lancer un conteneur qui publie le port 80 sur toutes les interfaces et le port 8080 en local.
{{% /notice %}}