var relearn_search_index=[{breadcrumb:"Home > Orchestration > Swarm",content:`Activation Swarm n’est pas actif par defaut dans Docker.
Essayer la commande suivante:
$ docker node lsLe premier noeud d’un cluster Swarm est initialisé avec docker swarm init
Information Ne pas executer docker swarm init sur tous les noeuds !
Vous auriez plusieurs clusters différents.
Pour commencer il faut bien nommer ses machines.
Vérifier que les VMs ont bien 3 noms distincts, sinon renommer les !
$ sudo hostnamectl set-hostname node1 $ sudo hostnamectl set-hostname node2 $ sudo hostnamectl set-hostname node3Puis vérifier qu’ils sont bien synchronisé à un serveur de temps
Raft est très sensible sur les timing
$ sudo timedatectl set-timezone Europe/Paris $ sudo timedatectl set-ntp true Maintenant allons créer notre cluster sur le node1
$ docker swarm init Information Il est possible de choisir son interface de control(–advertise-addr/–listen-addr) et de data(–data-path-addr)
Le control plane est utilisé par Swarm pour les communications manager/worker, election Raft,… Le data plane est utilisé pour les communications entre les conteneurs.
Les tokens Docker à générer deux tokens pour notre cluster, un pour joindre les managers et l’autre pour joindre les workers. Vous en avez aperçu un juste après l’initialisation.
To add a worker to this swarm, run the following command: docker swarm join --token SWMTKN-1-29jzjk0kmcunwcxlweugx75jhe0iqgokj2hdfkrad2ebrv640t-dsup5h5kmp5o7fndkk05zprkm 10.59.72.14:2377Verifier que nous avons bien activé Swarm
$ docker info [...] Swarm: active [...]Ressayons la commande de tout a l’heure
$ docker node lsAjouter un noeud Un cluster avec noeud c’est pas fun. Ajoutons node2 à notre cluster en tant que worker. Sur le node1
// Afficher le token des worker $ docker swarm join-token worker Puis executer la commande affichée en sortie sur node2
$ ssh node2 $ docker swarm join ...Restons un peu sur ce node2 Verifions que la commande à bien activé Swarm
$ docker info | grep SwarmCependant, les commandes Swarm ne fonctionneront pas
$ docker node lsNous sommes sur node2, un worker, seuls les managers peuvent recevoir les commandes de cluster.
Retournons sur node1 et voyons a quoi ressemble notre cluster maintenant.
$ docker node ls Astuce Les tokens sont générés à l’initialisation du cluster, ce sont des certificats signés par le CA du cluster.
On peut les regénérer avec docker swarm join-token --rotate <worker|manager> si ils sont compromis.
Information Le control plance est crypté, les clefs sont regénérés toutes les 12h.
Les certificats eux sont valable 90 jours par défaut.
Le data plane, lui, n’est pas crypté par défaut mais peut être activé pas réseau.
Ajouter un autre manager Nous avons donc un manager node1 et un worker node2.
Si on perd node1, on perd le quorum du Raft et c’est mal.
Les services continueront de fonctionner, mais plus aucune commande cluster ne sera accepté.
Si le manager ne revient pas, il va falloir faire une réparation manuelle, personne ne veut ça.
Allons ajouter le node3 en tant que manager.
// Sur un manager $ docker docker swarm join-token manager // Sur notre node3 $ docker swarm join --token ... Information Essayer la commande docker node ls sur le node3 L’étoile (*) à coté de l’ID du neud correspond au manager auquel nous sommes connectés.
Il est possible de changer le rôle d’un noeud via un manager.
Essayer de passer node2 en tant que manager
$ docker node promote node2 Astuce Combien de manager a-t-on besoin ?
2N+1 noeuds peuvent tolérer N pannes.
1 manager = Pas de panne
3 managers = 1 panne
5 managers = 2 pannes (Ca nous donne le droit à l’erreur en cas de maintenance)
I ne faut pas mettre trop de manager, en règle générale 5 est suffisant pour un cluster, même très gros.
Plus on ajoute de managers, plus la réplication Raft mettra de temps.
La replication Raft doit essayer de rester sous les 10ms entre les managers.
`,description:"",tags:null,title:"Créer son cluster Swarm",uri:"/orchestration/swarm/create_swarm/"},{breadcrumb:"Home > Orchestration",content:'Bien que nous puissions installer Docker Compose à partir des repos officiels Ubuntu, cette version n’est pas très à jour.\nNous allons donc installer Docker Compose à partir du repo github de Docker Compose .\nLe site de Docker propose une documentation pour l\'installation .\n$ latest=$(curl -sL "https://api.github.com/repos/docker/compose/releases/latest" |\\jq -r \'.tag_name\') $ sudo curl -L "https://github.com/docker/compose/releases/download/$latest/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose $ sudo chmod +x /usr/local/bin/docker-compose $ docker-compose --version',description:"",tags:null,title:"Installer docker-compose",uri:"/orchestration/install-compose/"},{breadcrumb:"Home > Docker et Linux",content:`Les Namespaces jouent un rôle important dans les conteneurs.
Ils permettent de placer les conteneurs dans leur propre vu du système et limitent ce que l’on peut faire et voir.
Il y a different type de namespaces:
pid net mnt uts ipc user Les namespaces font partie du Kernel et sont actifs dès le démarrage de l’OS.
Même sans l’utilisation des conteneurs, il y a au moins un namespace de chaque type qui contient tous les processus du système.
Ils sont donc liés au système et créés grâce à deux Syscall principaux : clone() et unshare()
La commande unshare permet de faire appel à ces Syscall.
nsenter fait appel au syscall setns() et nous permet d’inspecter les namespaces.
Quand le dernier processus d’un namespace s’arrête, le namespace est detruit et toutes les ressources qui vont avec.
On les retrouve décrit par des fichiers dans /proc/<PID>/ns
Avertissement Vérifier dans votre VM les namespaces utilisés par init ( PID 1) et dockerd (pidof dockerd)
Créer son premier namespace net Astuce Le netns sera vu dans la partie suivante.
UTS Nous allons utiliser le namespace uts.
Il permet concrétement de choisir le hostname du conteneur.
// Dans la VM $ hostname apinon-droplet-1 $ sudo unshare --uts /bin/bash // Ici on est dans le namespace // hostname my.name.is.bob # hostname my_name_is_bob Astuce Ouvrir un nouveau terminal et vérifier le hostname de la VM.
On peut quitter le namespace avec ctrl+d ou exit
mnt On peut aussi isoler les points de montage.
Ouvrir deux terminaux sur la VM.
// Terminal 1 (dans le namespace) $ sudo unshare --mount /bin/bash $ mount -t tmpfs none /tmp # ls -l /tmp// Terminal 2 (dans la VM) $ ls -l /tmpNous avons monté un point de montage privé dans notre namespace.
pid Les processus avec un PID namespace voient seulement les processus dans le même PID namespace.
Chaque PID namespace à sa propre arborescence (à partir de 1)
Si le PID 1 se termine, alors le namespace est terminé (sur Linux, si on kill le PID 1, on a un Kernel Panic)
// On entre dans notre namespace $ sudo unshare --pid --fork /bin/bash # ps aux Information Que se passe t-il ?
Nous avons créé un PID namespace, mais Linux se base sur le point de montage /proc pour afficher les processus.
Notre PID namespace à donc encore accès au PID de la VM, même s’il ne peut plus intéragir avec.
// On entre dans notre namespace $ sudo unshare --pid --fork /bin/bash # pidof dockerd # kill -9 $(pidof dockerd) bash: kill: (7807) - No such processPour contourner cela, la command unshare fournit l’option --mount-proc
// On entre dans notre namespace $ sudo unshare --pid --fork --mount-proc /bin/bash # ps aux Astuce Il n’est pas obligatoire de comprendre tout ce qui suit, mais une explication s’impose. Vous avez peut être remarqué le –fork
C’est une complexité due au fonctionnement du syscall unshare() qui exec() le processus en argument.
Si on ne fork pas le processus qui lance le syscall, celui-ci va lancer le namespace puis se terminer dans l’OS, ce qui va donc terminer le namespace.
En utilisant --fork, unshare va dupliquer le processus après avoir créé le PID namespace. Puis lancer /bin/bash dans le nouveau processus.
user Le user namespace permet de séparer les UID/GID entre l’hôte et le namespace.
Cela permet d’être root dans le namespace avec un utilisateur standard de l’hôte.
(Dans la VM) $ id uid=1000(alexxx) gid=1000(alexxx) groups=1000(alexxx) // Notez que \`unshare\` est lancé sans \`sudo\` // (Dans la VM) $ unshare --user /bin/bash (Dans le NS) $ id id=65534(nobody) gid=65534(nogroup) groups=65534(nogroup) (Dans le NS) $ exit (Dans la VM) $ unshare --user -r /bin/bash (Dans le NS) # id uid=0(root) gid=0(root) groups=0(root),65534(nobody)La séparation des UID dans docker complique le partage de fichier entre conteneurs.
`,description:"",tags:null,title:"Les Namespaces",uri:"/docker_linux/namespaces/"},{breadcrumb:"Home > Automatisation d'une image",content:`Un Quoi ? Le dockerfile est en gros la recette pour créer une image Docker.
Il contient toutes les instructions pour indiquer au daemon quoi faire et comment doit être construite notre image.
La commande à utiliser est docker build
Notre premier Dockerfile Information Vous pouvez utiliser la commande suivante pour nettoyer votre environnement docker du travail précédent.
docker rm -f $(docker ps -q); docker system prune -af --volumes
Ces commandes suppriment les conteneurs actifs puis les volumes/images/conteneurs inactifs
FROM et RUN Nous allons construire ensemble le premier Dockerfile.
Le DockerFile doit être dans un dossier vide.
$ mkdir mon_imagePuis ajouter un Dockerfile dans ce répertoire.
$ cd mon_image $ touch DockerfileLancer l’éditeur de votre choix pour modifier le Dockerfile
FROM ubuntu RUN apt-get update RUN apt-get -y install figlet FROM indique l’image de base pour notre build. RUN Execute notre commande pendant le build, RUN ne doit pas être interactif, d’où le -y durant le apt-get. Sauvegarder votre Dockerfile, puis on execute le build
$ docker build -t figlet . -t indique le nom de notre image (nous reviendrons sur le nommage juste après) . indique l’emplacement du contexte de notre build. Sending build context to Docker daemon 2.048kB
le contexte est envoyé à dockerd sous forme de tarball, utile si on build sur une machine distante.
Nous pouvons désormais utiliser notre nouvelle image et executer le programme figlet
$ docker run -ti figlet root@7d038d8e1960:/# figlet Good JobCMD et ENTRYPOINT Afin de lancer automatiquement un processus dans notre image au lieu de l’executer dans un shell, nous pouvons utiliser CMD ou ENTRYPOINT.
CMD permet de definir une commande par defaut quand aucune n’est donnée au lancement du conteneur.
Un seul CMD est autorisé, seul le dernier est pris en compte.
ENTRYPOINT defini une commande de base.
Le CMD ou les arguments en ligne de commande seront les paramètres de l’ENTRYPOINT
Avertissement Editer le Dockerfile précédent pour ajouter un ENTRYPOINT et un CMD afin d’afficher I Love Containers avec figlet.
la conteneur sera lancé avec docker run ilovecontainers
Avertissement Avec cette dernière image, je veux lancer un conteneur en mode interactif sous bash. Quel serait la marche a suivre ? Vous pouvez chercher dans la documentation de Docker pour vous familiariser avec le site:
Documentation: Docker build Tips and Tricks On ne va pas trop rentrer dans les details, mais il faut savoir qu’il y a quelques bonnes habitudes à respecter lorsque l’on créé un Dockerfile.
En voici quelques unes pour ne pas être étonné de les voir, si vous tombez sur certain Dockerfile.
Il faut reduire le nombre de layers Ne pas installer des paquets inutiles Supprimer les fichiers temporaires et caches avant de changer de layer.
Sachant que chaque layer est indépendant, supprimer un fichier créé dans un layer précedant ne reduira pas la taille de l’image. Pour en savoir plus, le site de Docker est une bonne base d’information pour commencer. Je reste dispo pour les questions si besoin.
`,description:"",tags:null,title:"Le Dockerfile",uri:"/image_automation/dockerfile/"},{breadcrumb:"Home > Docker et Linux > Les Réseaux",content:`Docker inclut plusieurs drivers Réseau que l’on peut choisir avec l’option --net <driver>
bridge (par defaut) none host container Le bridge Par defaut le conteneur obtient une interface virtuelle eth0 en plus de son interface de bouclage (127.0.0.1)
Cette interface est fournie par une paire de veth.
Elle est connectée au Bridge Docker appelé docker0 par defaut.
Les adresses sont allouées dans un réseau privé interne 172.17.0.0/16 par défault.
Le trafic sortant passe par une régle iptables MASQUERADE, puis le trafic entrant et naté par DNAT.
Les régles sont automatiquement gérées par Docker.
Le null driver Pas grand chose à dire sur celui-là, Si ce n’est que le conteneur ne peut pas envoyer ni recevoir de trafic.
Il obtient uniquement son adresse local lo
Le host driver Le conteneur executé avec ce driver voit et accède aux interfaces de l’hôte.
Le trafic n’est donc pas naté et ne passe pas par une veth.
Ce driver permet donc d’avoir les performances natives de la carte réseau. Très pratique dans des applications sensibles à la latence (Voip, streaming, …)
Le driver container Celui-ci est un peu spécial car il permet de réutiliser la stack réseau d’un autre conteneur.
Les deux conteneurs partagent la même interface, IP, routes, …
Ils peuvent communiquer au travers de 127.0.0.1.
`,description:"",tags:null,title:"Les Pilotes Réseau",uri:"/docker_linux/networks/network_driver/"},{breadcrumb:"Home > Docker > Travailler avec les images",content:`Une image n’est pas un conteneur ! Une image est un système de fichiers en lecture seule
Un conteneur est processus qui s’execute dans une copie de ce système de fichiers.
Pour accélérer le démarrage et optimiser les accès disque, plutôt que de copier l’image entière, on utilise ici du Copy-On-Write.
Plusieurs conteneurs peuvent donc utiliser la même image sans dupliquer les données.
Si une image est en lecture seule, on ne modifie pas une image, on en crée une nouvelle.
Nous avons utilisé l’image ubuntu tout a l’heure.
Nous pouvons inspecter ses layers de la manière suivante
$ docker image history ubuntu:latest IMAGE CREATED CREATED BY SIZE COMMENT 1d622ef86b13 7 weeks ago /bin/sh -c #(nop) CMD ["/bin/bash"] 0B <missing> 7 weeks ago /bin/sh -c mkdir -p /run/systemd && echo 'do… 7B <missing> 7 weeks ago /bin/sh -c set -xe && echo '#!/bin/sh' > /… 811B <missing> 7 weeks ago /bin/sh -c [ -z "$(apt-get indextargets)" ] 1.01MB <missing> 7 weeks ago /bin/sh -c #(nop) ADD file:a58c8b447951f9e30… 72.8MBLes données relatives aux images et aux conteneurs sont stockées dans: /var/lib/docker/
`,description:"",tags:null,title:"Image vs Conteneur",uri:"/docker/work_with_images/image_vs_container/"},{breadcrumb:"Home > Docker",content:`Hello World Dans votre nouvel environnement, tapez la commande suivante:
$ docker run busybox echo hello world hello world Nous avons utilisé une des plus simple et petite image: busybox busybox est souvent utilisé dans les systèmes embarqués. Nous avons lancé un simple processus et affiché hello world La premiere fois que l’on lance un conteneur, l’image est chargée sur la machine, cela explique les lignes supplémentaires. Conteneur interactif Lançons un conteneur un peu plus sympa
$ docker run -it ubuntu root@ae1c076701b7:/# Nous venons de lancer un simple conteneur sous ubuntu
-it est un raccourci pour -i -t.
-i nous connecte au stdin du conteneur
-t nous donne un pseudo-terminal dans le conteneur
Utiliser le conteneur Essayez de lancer figlet dans notre conteneur
root@ae1c076701b7:/# figlet bash: figlet: command not foundNous avons besoin de l’installer
root@ae1c076701b7:/# apt-get update && apt-get install figlet -y [...] root@ae1c076701b7:/# figlet hello-world _ _ _ _ _ | |__ ___| | | ___ __ _____ _ __| | __| | | '_ \\ / _ \\ | |/ _ \\ ____\\ \\ /\\ / / _ \\| '__| |/ _\` | | | | | __/ | | (_) |_____\\ V V / (_) | | | | (_| | |_| |_|\\___|_|_|\\___/ \\_/\\_/ \\___/|_| |_|\\__,_|Conteneurs et VMs Sortir du conteneur avec exit et lancer la commande à nouveau figlet hello-world, cela fonctionne-t-il ?
Nous avons lancé un conteneur ubuntu sur une machine hôte linux. Ils ont des paquets differents et sont independants, même si l’OS est identique.. Mais où est mon conteneur ? Notre conteneur à maintenant un statut stopped. Il est toujours présent sur le disque de la machine mais tous les processus sont arrétés.
Nous pouvons lancer un nouveau conteneur, et lancer figlet à nouveau
root@b6cb64d4bddc:/# figlet bash: figlet: command not foundNous avons lancé un tout nouveau conteneur avec la même image de base ubuntu et figlet n’est pas installé.
Il est possible réutiliser un conteneur qui à été arrêté mais ce n’est pas la philosophie des conteneurs.
Voyez un conteneur comme un processus à usage unique, si l’on veut réutiliser un conteneur personnalisé, on crée une image
Cela permet de garder le coté immuable d’un conteneur et de pouvoir le partager de facon fiable.
Information Nous verrons dans un prochain chapitre comment personnaliser une image !
`,description:"",tags:null,title:"Travailler avec les conteneurs",uri:"/docker/work_with_container/"},{breadcrumb:"Home > Introduction",content:`Avant:
application en un seul bloc Cycle de developpement long Un seul environnement de prod Scalabilitée lente Aujourd’hui:
Architecture orientée microservices Mise a jour fréquente et rapide Environnement multiple Besoin de scalabilité rapide `,description:"",tags:null,title:"Pourquoi docker ?",uri:"/introduction/why_docker/"},{breadcrumb:"Home",content:`Partie 1 Introduction Introduction à docker et au concept de conteneurs.
On ne lancera pas (tout de suite) de conteneur dans ce chapitre !
`,description:"",tags:null,title:"Introduction",uri:"/introduction/"},{breadcrumb:"Home > Orchestration > Swarm",content:` Avertissement Pour les besoins du TP, on va garder un manager et 2 workers.
Les applications ne sont pas critiques et nous sommes en mode POC.
On va donc ne garder que node1 en tant que manager.
Executer la commande suivante sur node1 :
$ docker node demote node2
$ docker node demote node3
Lancer le service On lance un service avec la commande docker service create ..., on peut faire l’analogie avec docker run ...
Créer un service avec une image alpine qui va ping 1.1.1.1:
$ docker service create --name pingpong alpine ping 1.1.1.1Vérifier le resultat
$ docker service ps pingpongInspecter les logs De la même manière que l’on irait voir les journaux d’un conteneur avec docker logs ...
On utilise ici docker service logs ... $ docker service logs pingpongAvec la commande docker service ps on peut voir où notre task a été deployé.
$ docker service ps pingpong // Chercher dans la colonne NODEConnectez vous sur ce noeud et lister les conteneur docker ps puis verifier les logs de notre conteneur.
Revenez ensuite sur le manager.
Scaling On va maintenant créer 2 copies de notre service sur chaque noeud du cluster.
$ docker service scale pingpong=6Vérifier avec docker service ps ... où sont deployés les tasks, et vérifier avec docker ps les conteneurs sur node1
On voit que les opérations de scaling peuvent prendre du temps. Si l’on souhaite recupérer la main, on peut utiliser --detach=true.
La commande ne va pas se terminer plus rapidement, mais on pourra éxécuter d’autres commandes pendant ce temps.
Voyons ca de suite:
$ docker service scale pingpong=24 --detach=true && watch -n1 'docker service ps pingpong'On peut maintenant arrêter le flood :)
$ docker service rm pingpongAvec un port On peut exposer un service de la même manière qu’avec la commande docker run, à quelques différances près. Avec docker service create -p HOST:TASK :
Le port HOST sera disponible sur TOUS les noeuds du swarm. Les requêtes seront Load Balancé entre toutes les tasks. On va deployer un service ElasticSearch, on va l’appeler demo
$ docker service create --name demo --publish 9200:9200 --replicas 5 elasticsearch:2-alpinePendant l’initialisation du service, on peut voir plusieurs etapes.
assigned (assignement de la task à un noeud) preparing (téléchargement de l’image) starting running Quand une task est arrêtée, elle ne peut pas être redémarrée, une nouvelle sera créée à sa place.
On peut tester notre service, il écoute sur le port 9200 des noeuds du cluster.
$ curl -sL 127.0.0.1:9200ElasticSearch nous retourne un json avec les infos sur l’instance.
On retrouve des noms de Super Heros dans la clef name.
Essayons d’executer la commande plusieurs fois, on devrait voir plusieurs noms.
for N in $(seq 1 10); do curl -sL 127.0.0.1:9200 | jq -r '.name' doneLe trafic est géré par le routing mesh.
Chaque requête est delivrée par une des instances de notre service en Round Robin.
Astuce Le LoadBalancing est opérée par IPVS, chaque noeud à donc son LoadBalancer.
Mais IPVS ne gére pas le Layer7.
Il faut un service dans Swarm pour router les requêtes vers les bons services.
Ce service soit être compatible avec Swarm pour modifier sa config dynamiquement.
Il existe par exemple Traefik qui le fait très bien.
`,description:"",tags:null,title:"Créer un service",uri:"/orchestration/swarm/create_service/"},{breadcrumb:"Home > Orchestration",content:`Docker fournit un repository Github avec plusieurs applications pour tester Docker.
Nous allons utiliser l’application dockercoins pour essayer Docker Compose.
J’ai préparé l’application dans le repo du TP.
Vous pouvez récupérer le repo sur la machine en clonant le repo git du TP.
$ git clone https://github.com/zaggash/tp-iut-docker.git $ cd tp-iut-docker/ $ cd dockercoins/
On ne va pas rentrer dans trop de details concernant la syntaxe d’un docker-compose.yaml.
Cela prendrait beaucoup de temps et la documentation de Docker est un bien meilleur référentiel avec un tas d’exemples et d’explications.
Lancer l’application Docker compose est très pratique en mode developpement.
Cela permet de lancer une stack applicative complète à partir des fichiers présents sur notre machine.
On lance l’application avec docker-compose
$ docker-compose upCompose demande à Docker de construire l’application en créant des images, puis de lancer les conteneurs et enfin afficher les logs.
L’application est composé de 5 services:
* rng = un service web qui génére des bits aléatoires
* hasher = un service web qui hash les bits reçu
* worker = Un processus qui qui fait appel a rng et haser
* webui = Une interface web
* redis = La base de donnée
worker fait appel à rng avec un GET pour générer un byte aléatoire, puis il le renvoie avec un POST à hasher.
Indéfiniment…
worker met à jour redis a chaque boucle.
webui permet d’afficher les resultats.
Aucune adresse IP n’est spécifiée, que ce soit dans le code ou dans le docker-compose.yaml.
Les applications utilisent le nom des services respectifs pour atteindre les conteneurs. Vous pouvez voir dans worker/worker.py
redis = Redis("redis") def get_random_bytes(): r = requests.get("http://rng/32") return r.content def hash_bytes(data): r = requests.post("http://hasher/", data=data, headers={"Content-Type": "application/octet-stream"}) Avertissement Chercher avec les commandes docker ou dans le fichier compose, le port sur lequel est exposé webui
On peut maintenant arrêter l’application avec un ctrl+c
Docker va stopper les conteneur avec un TERM puis un KILL si necessaire.
On peut forcer le KILL avec un deuxième ctrl+c.
En arrière plan On peut relancer l’application en arrière plan
$ docker-compose up -d // Puis $ docker-compose ps $ docker-compose logs --tail 10 --followScaling UP Notre but va être d’accélérer l’application sans toucher au code. Mais avant on va chercher si il y a un bottleneck ( Pas assez de RAM, de CPU, IO ?)
Information Essayer de trouver par vous même, sinon rdv à la suite.
Pour le CPU et la RAM on va lancer top, puis chercher les cycles idle et la RAM Free.
vmstat 1 10 va nous donner un extrait sur 10s pour voir les IO disque.
Information Y a t-il assez de ressource ?
2 workers Ajouter un nouveau worker à l’application
$ docker-compose up -d --scale worker=2Puis ouvrir de nouveau le navigateur sur l’interface Web.
Information Y a t-il un impact sur les ressources ?
10 workers alors ! On va donc augmenter les workers jusque 10 et l’application ira 10x plus vite.
$ docker-compose up -d --scale worker=10 Information Est ce bien le cas ?
Vérifions les ressources CPU, RAM, IO une nouvelle fois. Puis la latence des deux backend web.
$ top $ vmstat 1 10 // Latence rng, exposé sur le port 8001 $ httping -fc 10 127.0.0.1:8001 // Latence hasher, sur le port 8002 $ httping -fc 10 127.0.0.1:8002 Information Quel service pose problème ? Comment peut on résoudre le problème ?
Stopper l’application Avant de passer à autre chose, je suis disponible pour faire un point sur l’avancement et les questions que vous pourriez avoir. Des problèmes ?
On peut maintenant arrêter l’application
$ docker-compose down`,description:"",tags:null,title:"Une app Docker Compose",uri:"/orchestration/compose-app/"},{breadcrumb:"Home > Docker et Linux > Les Réseaux",content:`On peut lister les réseaux avec docker network ls
$ docker network ls NETWORK ID NAME DRIVER SCOPE a5fa804dcca5 bridge bridge local a5a200b4762b host host local b35f65ab844b none null localOn peut considérer un réseau comme un Virtual Switch.
Docker va lui assigner automatiquement un sous-réseau puis une IP aux conteneurs associés.
Les conteneurs peuvent faire partis de plusieurs réseaux à la fois.
Les noms des conteneurs sont résolus via un serveur DNS embarqué dans le Docker daemon.
Il existe aussi un driver multi-hôtes utilisé lors de la mise en cluster de plusieurs machines (un Cluster Swarm)
Ce driver, appelé overlay fonctionne au travers de lien VXLAN. Nous reviendrons sur celui-ci un peu plus tard.
Un réseau, deux conteneurs Créer un réseau devops
$ docker network create devops 8a5841273868138b581a8c663e9a042f181a1a52c0028c21988ffd474c117610Vous pouvez le voir avec docker network ls
Maintenant, lancer un conteneur sur ce réseau et donnez lui un nom reconnaissable.
$ docker run -d --name AppDev --net devops hashicorp/http-echo -text "Mon AppDev"Maintenant, lancer un autre conteneur dans ce même réseau et lancer un ping vers votre premier conteneur AppDev
$ docker run -ti --net devops alpine sh / # ping appdev
On peut inspecter le réseau avec docker inspect devops
$ docker inspect devops [ { "Name": "devops", "Id": "8be916360cbc400758d107e47e02a9890d37da0fe3cb0a3a11acde60173a03de", "Created": "2020-06-14T01:49:07.632816857Z", "Scope": "local", "Driver": "bridge", "EnableIPv6": false, "IPAM": { "Driver": "default", "Options": {}, "Config": [ { "Subnet": "172.20.0.0/16" } ] }, "Internal": false, "Attachable": false, "Ingress": false, "ConfigFrom": { "Network": "" }, "ConfigOnly": false, "Containers": { "2496236a9109045a1cfb17cd237e84208fe2b3fee7b861e212aeaf7bce9bf61c": { "Name": "AppDev", "EndpointID": "19a945be9b13b373dc49c840c9871bfa60ed7bfba163c7a93e763b7f016102dc", "MacAddress": "02:42:ac:14:00:02", "IPv4Address": "172.20.0.2/16", "IPv6Address": "" } }, "Options": {}, "Labels": {} } ]Dans mon cas on peut voir que devops à un sous réseau en 172.20.0.0/16
Puis la définition de mon conteneur avec l’IP 172.20.0.2/16
Maintenant sur la VM, lister les interfaces réseau
$ ip a [...] 262: br-8be916360cbc: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default link/ether 02:42:f3:81:04:97 brd ff:ff:ff:ff:ff:ff inet 172.20.0.1/16 brd 172.20.255.255 scope global br-8be916360cbc valid_lft forever preferred_lft forever inet6 fe80::42:f3ff:fe81:497/64 scope link valid_lft forever preferred_lft forever 264: vethcbea7f9@if263: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-8be916360cbc state UP group default link/ether 96:56:cf:87:0d:3d brd ff:ff:ff:ff:ff:ff link-netnsid 0 inet6 fe80::9456:cfff:fe87:d3d/64 scope link valid_lft forever preferred_lft foreverVous pouvez voir les interfaces de la VM, le bridge docker0.
Puis deux interfaces br-8be916360cbc, vethcbea7f9@if263 qui sont le bridge du réseau devops et l’interface veth du conteneur coté VM.
On peut voir ça aussi avec brctl
$ brctl show bridge name	bridge id	STP enabled	interfaces br-8be916360cbc	8000.0242f3810497	no	veth1eecb09 docker0	8000.02422beae43c	no	On peut aller un peu plus loin Créér un deuxième réseau prod
Lancer un conteneur dans ce réseau prod
$ docker run -d --name AppProd hashicorp/http-echo -text "Production"Obtenir l’IP de AppDev et AppProd
$ docker run --rm --net container:AppDev alpine ip a 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 inet 127.0.0.1/8 scope host lo valid_lft forever preferred_lft forever 265: eth0@if266: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP link/ether 02:42:ac:14:00:02 brd ff:ff:ff:ff:ff:ff inet 172.20.0.2/16 brd 172.20.255.255 scope global eth0 valid_lft forever preferred_lft forever $ docker run --rm --net container:AppProd alpine ip a 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 inet 127.0.0.1/8 scope host lo valid_lft forever preferred_lft forever 268: eth0@if269: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP link/ether 02:42:ac:18:00:02 brd ff:ff:ff:ff:ff:ff inet 172.24.0.2/16 brd 172.24.255.255 scope global eth0 valid_lft forever preferred_lft foreverOn a donc AppDev : 172.20.0.2/16 et AppProd : 172.24.0.2/16
Avertissement Essayer de pinger AppProd à partir du namespace réseau de AppDev (--net container:AppDev) avec un conteneur alpine.
Que se passe t-il ?
On a vu que Docker est lié au Kernel, nous allons très simplement connecter AppDev et AppProd sans passer par Docker.
Nous allons créer une paire de Veth, puis connecter un bout au bridge devops et un autre dans le namespace du conteneur AppProd
# On crée la paire de veth $ sudo ip link add name int_hote type veth peer name int_conteneur # On associe in_hote au bridge $ sudo ip link set int_hote master br-8be916360cbc up # On voit nos interfaces dans la VM $ ip a | grep int 270: int_conteneur@int_hote: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000 271: int_hote@int_conteneur: <NO-CARRIER,BROADCAST,MULTICAST,UP,M-DOWN> mtu 1500 qdisc noqueue master br-8be916360cbc state LOWERLAYERDOWN group default qlen 1000Il nous faut trouver le pid de AppProd pour associer l’autre veth à son network namespace
$ ps ax | grep 'Production' 3146 ? Ssl 0:00 /http-echo -text ProductionLe PID est le 3146
$ ip link set int_conteneur netns 3146On va utiliser la commande nsenter pour se balader dans les namespaces.
$ nsenter -n -u -t 3146 root@69421ba25609:~# ip a 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 inet 127.0.0.1/8 scope host lo valid_lft forever preferred_lft forever 268: eth0@if269: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default link/ether 02:42:ac:18:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0 inet 172.24.0.2/16 brd 172.24.255.255 scope global eth0 valid_lft forever preferred_lft forever 270: int_conteneur@if271: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000 link/ether 26:d7:1f:f9:fb:77 brd ff:ff:ff:ff:ff:ff link-netnsid 0Maintenant on configure l’interface dans le conteneur AppProd.
root@69421ba25609:~# ip link set int_conteneur name eth1 up root@69421ba25609:~# ip a 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 inet 127.0.0.1/8 scope host lo valid_lft forever preferred_lft forever 268: eth0@if269: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default link/ether 02:42:ac:18:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0 inet 172.24.0.2/16 brd 172.24.255.255 scope global eth0 valid_lft forever preferred_lft forever 270: eth1@if271: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000 link/ether 26:d7:1f:f9:fb:77 brd ff:ff:ff:ff:ff:ff link-netnsid 0 # # Rappel, le sous réseau devops est 172.20.0.0/16 # On va prendre un IP dans ce réseau : 172.20.0.100/16 # root@69421ba25609:~# ip addr add 172.20.0.100/16 dev eth1 root@69421ba25609:~# ip route add default via 172.20.0.1 Avertissement Essayer maintenant à nouveau de pinger AppProd à partir de AppDev.
Connectez vous au namespace avec nsenter pour jouer avec ;) Que se passe t-il ?
Avertissement Supprimer maintenant les deux conteneurs.
Observer les interfaces réseau au niveau de la VM.
`,description:"",tags:null,title:"Dans le Réseau",uri:"/docker_linux/networks/inside_network/"},{breadcrumb:"Home > Automatisation d'une image",content:`Le Nommage Les images docker doivent respecter un certain schema de nommage pour être partager dans un registry.
Il y a 3 espaces de noms:
Les images officielles
alpine, ubuntu, python Les images officielles sont selectionées par Docker.
Elles sont directement dans l’espace de nom racine.
Ce sont généralement des images de tiers reconnues.
https://hub.docker.com Les images d’utilisateurs (ou d’organisations)
ghcr.io/zaggash/random L’espace de nom utilisateur contient les images des utilisateurs ou organisations.
zaggash est l’utilisateur dockerhub.
random est le nom de l’image.
Les images appartenant à un registry autre que le DockerHub
registry.mondns.fr:5000/mon_repo/mon_image Ce nom est composé de l’adresse IP ( ou DNS) du registry et du port.
Puis on retrouve la même logique que précédemment.
Les tags Vous avez peut être déjà remarqué mais les images ont un tag de version associé à leur nom, le tag par défaut est latest
$ docker pull ghcr.io/zaggash/random Using default tag: latest latest: Pulling from ghcr.io/zaggash/random 76df9210b28c: Pull complete Digest: sha256:f1eb69bbb25b4f0b88d2edfe1d5837636c9e5ffaad0e96a11c047005a882f049 Status: Downloaded newer image for ghcr.io/zaggash/random:latest docker.io/ghcr.io/zaggash/random:latestLe tag defini une variante, la version d’une image.
Avertissement Si vous n’avez pas de compte sur le DockerHub, je vous invite à en créer un, c’est gratuit » Inscription Essayer de pousser votre image créée précédemment, dans votre espace de nom avec docker login et docker push
Vous devrez certainement la renommer avec la commande docker tag » Documentation Docker CLI Le Hub Astuce Petite Pause !
On essaie de tous se retrouver pour une présentation de l’interface, et une session Questions/Réponses si besoin.
Les images officielles, les images utilisateurs/organisations Les Tags Présentation de l’integration avec Github Builds automatisés Les Webhooks `,description:"",tags:null,title:"Le Docker Hub",uri:"/image_automation/dockerhub/"},{breadcrumb:"Home > Docker et Linux",content:`Le serveur Nginx Pour avoir accès au service web de nginx il va falloir exposer son port. Lancer l’image nginx du Dockerhub qui contient un serveur web basique.
$ docker run -d -p 8080:80 nginx Unable to find image 'nginx:latest' locally latest: Pulling from library/nginx 8559a31e96f4: Pull complete 8d69e59170f7: Pull complete 3f9f1ec1d262: Pull complete d1f5ff4f210d: Pull complete 1e22bfa8652e: Pull complete Digest: sha256:21f32f6c08406306d822a0e6e8b7dc81f53f336570e852e25fbe1e3e3d0d0133 Status: Downloaded newer image for nginx:latest 8fe2d550ac86b4bb6f544710f4f65ffcc0f4728a2cf52f5b8455e0112b284ce0-p <ip>:8080:80 Ici on expose le port 80 du conteneur nginx sur le port 8080 de la VM
Par defaut, le port de la VM écoute sur 0.0.0.0
$ docker ps CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES b1fa3fc64a2f nginx "/docker-entrypoint.…" 3 seconds ago Up 2 seconds 0.0.0.0:8080->80/tcp stupefied_shawSur l’output ci-dessus, ou voit bien la colonne PORTS qui recapitule les ports ouverts.
On lance un curl pour verifier que l’on a bien un HTTP 200
$ curl -sLI 127.0.0.1:8080 HTTP/1.1 200 OK Server: nginx/1.19.0 Date: Sat, 13 Jun 2020 23:04:53 GMT Content-Type: text/html Content-Length: 612 Last-Modified: Tue, 26 May 2020 15:00:20 GMT Connection: keep-alive ETag: "5ecd2f04-264" Accept-Ranges: bytes Avertissement Essayer de lancer un autre conteneur nginx qui écoute sur le port 8080 uniquement sur localhost. Que se passe t - il ?
Avertissement Supprimer maintenant tous les conteneurs.
Essayer de lancer un conteneur qui publie le port 80 sur toutes les interfaces et le port 8080 en local.
`,description:"",tags:null,title:"Les Réseaux",uri:"/docker_linux/networks/"},{breadcrumb:"Home > Docker > Travailler avec les conteneurs",content:`Un conteneur non-interactif Nous allons lancer un conteneur tout simple qui affiche des nombres aléatoires chaque seconde.
$ docker run ghcr.io/zaggash/random 23008 19194 17802 16235 8189 667 Ce conteneur continuera de s’executer indéfiniement. Un ctrl+c permet de l’arrêter. en arrière-plan Nous pouvons lancer ce conteneur de la meme manière mais en arrière plan avec l’option -d
$ docker run -d ghcr.io/zaggash/random a5a20f1f8897d6b7a7644a322141ad74a3c21e28530b11cf10ef583ba539e55cOn ne voit plus la sortie standard du conteneur, mais le daemon dockerd collecte toujours stdin/stdout du conteneur et les écrit dans un fichier de log.
La chaîne de caractères est l’ID complet de notre conteneur.
Astuce Petit rappel du chapître précedent.
On peut voir le processus dockerd, PID 7807 qui contient la socket de containerd en argument.
Puis notre processus enfant 8247, executé par runc, PID 8217 lui même demarré par containerd, PID 2656
$ ps fxa | grep dockerd -A 3 [...] 2656 ? Ssl 42:56 /usr/bin/containerd 8217 ? Sl 0:00 \\_ containerd-shim -namespace moby -workdir /var/lib/containerd/io.containerd.runtime.v1.linux/moby/027b6c72b74f510b3403a3cd246e3c8c802034960cb82bf45dad8278f0e21d6c -address /run/containerd/containerd.sock -containerd-binary /usr/bin/containerd -runtime-root /var/run/docker/runtime-runc 8247 ? Ss 0:00 \\_ /bin/sh -c while echo $RANDOM;do sleep 1;done -- 7807 ? Ssl 1:03 /usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock [...]Un processus conteneurisé est un processus system comme un autre. On peut le voir avec un ps on peut faire l’analyser avec un strace, lsof,…
Plus de commandes Verifier l’état de notre conteneur Verifier les conteneurs en cours d’execution avec la commande docker ps
$ docker ps CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES a5a20f1f8897 ghcr.io/zaggash/random "/bin/sh -c 'while e…" 5 minutes ago Up 5 minutes crazy_khoranaL’API nous retourne:
l’ID tronqué de notre conteneur l’image utilisé par le conteneur l’etat du conteneur (Up) un nom généré aléatoirement Astuce Lancer 2/3 conteneurs supplémentaires et verifier que docker ps nous retourne tous les conteneurs.
Quelques commandes utiles 1 - Voir les ID des conteneurs Si vous voulez lister seulement les IDs des conteneurs, l’option -q renvoi une colonne sans les entêtes. Cet argument est particulièrement utile pour le scripting.
docker ps -q eaf444d185be aaeb4643ae39 a5a20f1f88972 - Voir les logs des conteneurs Docker garde les logs stderr et stdout de chaque conteneur. Verifions ça avec notre premier conteneur
$ docker logs a5a [...] 5412 3585 13237 20376 29438Docker nous retourne la totalité des logs du conteneur.
Pour eviter d’être polluer par tout ça, nous pouvons utiliser l’argument --tail et extraire les dernieres lignes
$ docker logs --tail 5 a5a 12893 32068 25356 571 16054Pour voir les logs en temps réel, on peut utiliser l’argument -f
$ docker logs --tail 5 -f a5a 6644 28412 3315 22610 27692 3136 9107 20481 ^CNous voyons les 5 dernières lignes de logs puis l’affichage en temps réél. ctrl+c pour quitter.
3 - Arrêter un conteneur Nous pouvons arrêter un conteneur de deux manières.
avec un kill avec un stop Le kill va arrêter le conteneur de manière immediate avec un signal KILL.
Le stop envoie un signal TERM et peut être intercepté par l’application pour terminer le processus.
Après 10s si le processus n’est pas arrêté, Docker envoi un KILL
On peut tester ça avec notre conteneur
$ docker stop a5a a5aNous voyons bien que le terminal nous rend la main après une dizaine de seconde.
Docker envoi un TERM Le conteneur ne réagit pas à ce signel, c’est une simple boucle en Shell. 10s après, le conteneur est toujours actif, alors Docker envoi un KILL et termine le conteneur. Maintenant, on va arrêter les conteneurs restant avec un kill en utilisant les commandes vues précédemment
$ docker kill $(docker ps -q) eaf444d185be aaeb4643ae39 $ docker ps CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMESNous voyons ici que les conteneurs ont été arrêtés immediatement.
$ docker ps -a docker ps -a CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES eaf444d185be ghcr.io/zaggash/random "/bin/sh -c 'while e…" 29 minutes ago Exited (137) 3 minutes ago friendly_chatelet aaeb4643ae39 ghcr.io/zaggash/random "/bin/sh -c 'while e…" 29 minutes ago Exited (137) 3 minutes ago recursing_dirac a5a20f1f8897 ghcr.io/zaggash/random "/bin/sh -c 'while e…" 44 minutes ago Exited (137) 8 minutes ago crazy_khorana`,description:"",tags:null,title:"Conteneurs en arrière-plan",uri:"/docker/work_with_container/background/"},{breadcrumb:"Home > Docker > Travailler avec les images",content:`Créer une image à partir d’un conteneur Il est possible de créer une image partir d’un conteneur et de ses modifications.
Meme si cette solution n’est pas la plus utilisée, elle peut être utilsée à des fins de tests ou de sauvegarde.
Reprenons notre exemple avec figlet pour créer une nouvelle image à partir du conteneur. Pour cela nous allons:
Lancer un conteneur avec une image de base de votre choix. Installer un programme manuellement dans le conteneur Puis utiliser les nouvelles commandes : docker commit, docker tag et docker diff docker diff pour voir les changements effectués dans le conteneur. docker commit pour convertir le conteneur en nouvelle image docker tag pour renommer l’image. Avertissement Essayez par vous même, sinon je reste disponible pour toutes questions.
Information Dans le prochain chapitre, nous allons apprendre à automatiser le build avec un Dockerfile
`,description:"",tags:null,title:"Création Image Interactive",uri:"/docker/work_with_images/interactive_image/"},{breadcrumb:"Home > Docker",content:`Qu’est ce qu’une image ? Une image est un ensemble de fichiers et de metadata.
Les fichiers constituent le FileSystem de notre conteneur. les metadata peuvent être de différentes formes le créateur de l’image les variables d’environnement les commandes à executer Les images sont en fait une superposition de couches appelées layers
Chaque layer ajoute, modifie ou supprime un fichier et/ou une metadata.
Les images peuvent partager des layers, ce qui permet d’optimiser l’utilisation de l’espace disque, les transferts réseaux
`,description:"",tags:null,title:"Travailler avec les images",uri:"/docker/work_with_images/"},{breadcrumb:"Home",content:`Partie 2 Docker Dans ce chapitre nous allons voir plusieurs types de conteneur.
Puis en apprendre un peu plus sur leurs fonctionnements.
`,description:"",tags:null,title:"Docker",uri:"/docker/"},{breadcrumb:"Home > Introduction > Architecture",content:`Le Docker Engine est divisé en plusieurs parties.
dockerd (REST API, authentification, réseaux, stockage) : Fait appel à containerd containerd (Gère la vie des conteneurs, push/pull les images) runc (Lance l’application du conteneur) containerd-shim (Par conteneur; permet de separer le processus et RunC) Plusieurs fonctionnalitées sont progressivement deleguées du Docker Engine à containerd
Information Des exercices du TP permettrons de verifier cela après l’installation
`,description:"",tags:null,title:"Docker Engine",uri:"/introduction/architecture/internal_architecture/"},{breadcrumb:"Home > Introduction",content:`Lorsque l’on installe Docker, on installe plusieurs composants.
Il y a le Docker Engine et la CLI.
Le Docker Engine est un demon qui tourne en arrière plan Les interactions avec ce daemon se font via une API REST par un Socket. Sous Linux, ce socket est un socket Unix : /var/run/docker/sock Il est également possible d’utiliser un Socket TCP avec authentification TLS. Le Docker CLI communique avec le daemon via cette Socket. `,description:"",tags:null,title:"Architecture",uri:"/introduction/architecture/"},{breadcrumb:"Home > Introduction > Pourquoi docker ?",content:`
Les deploiements deviennent de plus en plus compliqués, voici quelques exemples.
De nombreuses couches applicatives:
Language (php, go, JS,…) Framework Bases de données Plusieurs environnements cibles:
Machines locales pour les tests Environnements de Dev, QA, Pre-Prod, Prod Serveurs locaux, Cloud `,description:"",tags:null,title:"Deploiements complexes",uri:"/introduction/why_docker/complex_deployments/"},{breadcrumb:"Home > Orchestration > Swarm",content:` Information Pour commencer cette partie, nous allons supprimer le service demo
docker service rm demo
Swarm et les Overlay Nous venons de déployer une application sur le cluster et l’on a vu que le port du service est disponible sur tous les noeuds.
Cela est possible grâce au réseau par défaut de Swarm, appelé ingress.
$ docker network ls NETWORK ID NAME DRIVER SCOPE 6b141a0943ca bridge bridge local bfc621566968 docker_gwbridge bridge local 6dbb4bea0e35 host host local 1b6ek4sxqg9g ingress overlay swarm 797221e77f12 none null localC’est un réseau overlay installé de base, et nécessaire pour les flux entrant.
Nous pouvons de la même manière que les réseaux bridge qui ont un scope local, créer un réseau overlay qui à un scope au niveau du cluster.
$ docker network create --driver overlay --subnet 10.10.10.0/24 mon-overlay-demoPuis exécuter un serveur web simple exposé en dehors du cluster sur le port 8080.
Ce service aura 3 réplicas et sera attaché à notre overlay mon-overlay-demo
$ docker service create --name webapp --replicas=3 --network my-overlay-network -p 8080:80 ghcr.io/zaggash/demo-webappRelever l’ID du conteneur qui tourne sur notre noeud actuelle normalement node1
$ docker psPuis on entre dans le network namespace du conteneur pour afficher les interfaces.
$ sudo nsenter -n -t $(pidof -s nginx) # ip a 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 inet 127.0.0.1/8 scope host lo valid_lft forever preferred_lft forever 59: eth0@if60: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default link/ether 02:42:0a:00:00:16 brd ff:ff:ff:ff:ff:ff link-netnsid 0 inet 10.0.0.22/24 brd 10.0.0.255 scope global eth0 valid_lft forever preferred_lft forever 61: eth2@if62: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default link/ether 02:42:ac:12:00:06 brd ff:ff:ff:ff:ff:ff link-netnsid 2 inet 172.18.0.6/16 brd 172.18.255.255 scope global eth2 valid_lft forever preferred_lft forever 63: eth1@if64: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default link/ether 02:42:0a:0a:0a:18 brd ff:ff:ff:ff:ff:ff link-netnsid 1 inet 10.10.10.24/24 brd 10.10.10.255 scope global eth1 valid_lft forever preferred_lft foreverOn voit qu’il y en a 3, au lieu de une comme lorsque l’on lance un conteneur hors Swarm.
Le conteneur est connecté à mon mon-overlay-demo au travers de eth1, comme on peux le voir avec l’IP.
Les autres interfaces sont connectées à d’autres réseaux. eth0 est le ingress car nous exposons un port vers l’extérieur. eth2 est le docker_gwbridge, le bridge local qui permet au conteneur de sortir du cluster.
$ docker network inspect ingress | grep Subnet "Subnet": "10.0.0.0/24", $ docker network inspect docker_gwbridge | grep Subnet "Subnet": "172.18.0.0/16",Les Overlays Les réseaux overlay créent un sous réseau qui peut être utilisé par les conteneurs entre plusieurs noeuds dans le cluster.
Les conteneurs situés sur des noeud différents peuvent échanger des paquets sur ce réseau si ils sont attaché à celui-ci.
Par exemple, pour notre webapp, on voit qu’il y a un conteneur qui tourne sur chaque hôte dans notre cluster. On le vérifie:
$ docker service ps webapp ID NAME IMAGE NODE DESIRED STATE CURRENT STATE ERROR PORTS 9yrr2kdwc6t5 webapp.1 ghcr.io/zaggash/demo-webapp:latest node1 Running Running 37 minutes ago 4qyritdeuwhx webapp.2 ghcr.io/zaggash/demo-webapp:latest node3 Running Running 36 minutes ago eiqh6znlcvus webapp.3 ghcr.io/zaggash/demo-webapp:latest node2 Running Running 36 minutes agoSe connecter maintenant sur le node2 et essayé de ping le conteneur qui est sur le node1
(node2) | $ nsenter -n -t $(pidof -s nginx) (node2) | # ping 10.10.10.24 PING 10.10.10.24 (10.10.10.24) 56(84) bytes of data. 64 bytes from 10.10.10.24: icmp_seq=1 ttl=64 time=0.505 ms 64 bytes from 10.10.10.24: icmp_seq=2 ttl=64 time=0.373 ms 64 bytes from 10.10.10.24: icmp_seq=3 ttl=64 time=0.485 msVXLAN Les réseaux overlay de Docker utilisent la technologie VXLAN qui encapsule les trames ethernet (couche 2 du modèle OSI), dans un datagramme UDP (couche 4).
Ceci permet d’étendre un réseau de couche 2 au dessus de réseaux routés. Les membres de se réseau virtuel peuvent se voir comme s’ils étaient connecté sur un switch.
On identifie un réseau VXLAN par son identifiant VNI (VXLAN Network Identifier).
Celle-ci est codée sur 24 bits, ce qui donne 16777216 possibilités, bien plus intéressant que la limite de 4096 induite par les VLANs.
On peut le voir en prenant une trace sur les noeuds qui font partis de l’overlay.
Regardons la capture du ping entre le conteneur de node2 vers node1
(node2) | $ nsenter -n -t $(pidof -s nginx) (node2) | # ping 10.10.10.24 (node1) | $ sudo tcpdump -i ens160 udp and port 4789 [sudo] password for user: tcpdump: verbose output suppressed, use -v or -vv for full protocol decode listening on ens160, link-type EN10MB (Ethernet), capture size 262144 bytes 19:58:03.259691 IP 10.59.72.7.38266 > node1.4789: VXLAN, flags [I] (0x08), vni 4097 IP 10.10.10.26 > 10.10.10.24: ICMP echo request, id 25411, seq 36, length 64 19:58:03.259756 IP node1.59501 > 10.59.72.7.4789: VXLAN, flags [I] (0x08), vni 4097 IP 10.10.10.24 > 10.10.10.26: ICMP echo reply, id 25411, seq 36, length 64On peut voir dans les trames ci-dessus, que le premier est le paquet du tunnel VXLAN UDP entre les hôtes dans le port 4789.
Et à l’intérieur, on voit le paquet ICMP entre les conteneurs.
Encryption Le trafic que l’on a vu ci-dessus montre que si l’on peut voir les paquets entre les noeuds, on peut voir le trafic entre les conteneurs qui passe dans l’overlay.
C’est pourquoi Docker a ajouté une option qui permet de crypter avec IPsec le tunnel VXLAN.
Pour cela, il faut ajouter --opt encrypted lors de la création du réseau.
Répétons les étapes précédentes en utilisant un overlay crypté.
(node1) | $ docker service rm webapp (node1) | $ docker network rm mon-overlay-demo (node1) | $ docker network create --driver overlay --opt encrypted --subnet 10.20.20.0/24 mon-overlay-ipsec (node1) | $ docker service create --name webapp --replicas=3 --network mon-overlay-ipsec -p 8080:80 ghcr.io/zaggash/demo-webapp (node1) | $ docker ps CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES 1efc497c5983 ghcr.io/zaggash/demo-webapp:latest "/docker-entrypoint.…" 17 seconds ago Up 13 seconds 80/tcp webapp.1.ptfs32hrkcom2nu7syry31bwb (node1) | $ docker inspect 1efc497c5983 | grep IPv4Address "IPv4Address": "10.0.0.26" "IPv4Address": "10.20.20.3" (node1) | $ sudo nsenter -n -t $(pidof -s nginx) (node1) | # ping 10.20.20.4 PING 10.20.20.4 (10.20.20.4) 56(84) bytes of data. 64 bytes from 10.20.20.4: icmp_seq=1 ttl=64 time=0.503 ms 64 bytes from 10.20.20.4: icmp_seq=2 ttl=64 time=0.412 ms (node1) | $ sudo tcpdump -i ens160 esp tcpdump: verbose output suppressed, use -v or -vv for full protocol decode listening on ens160, link-type EN10MB (Ethernet), capture size 262144 bytes 20:22:42.338614 IP node1 > 10.59.72.7: ESP(spi=0x1916910d,seq=0x19), length 140 20:22:42.338976 IP 10.59.72.7 > node1: ESP(spi=0x01fcdf39,seq=0x19), length 140 20:22:43.349513 IP node1 > 10.59.72.7: ESP(spi=0x1916910d,seq=0x1a), length 140 20:22:43.349913 IP 10.59.72.7 > node1: ESP(spi=0x01fcdf39,seq=0x1a), length 140Inspecter un réseau Overlay De la même manière que les réseaux bridge, Docker créé une interface bridge pour chaque overlay.
Ce bridge connecte les interfaces virtuelles du tunnel pour établir les connections du tunnel VXLAN entre les hôtes.
Cependant, ces bridges et interfaces de tunnel VXLAN ne sont pas créés directement sur l’hôte.
Ils sont dans un conteneur séparé que Docker lance pour chaque réseau overlay.
Pour inspecter ces interfaces, nous devons utiliser nsenter pour accèder à leur namespace.
Déjà voyons les interfaces de notre conteneur, nous en avons des nouveau depuis le test du tunnel IPsec:
$ sudo nsenter -n -t $(pidof -s nginx) ifconfig 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 inet 127.0.0.1/8 scope host lo valid_lft forever preferred_lft forever 68: eth0@if69: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default link/ether 02:42:0a:00:00:1a brd ff:ff:ff:ff:ff:ff link-netnsid 0 inet 10.0.0.26/24 brd 10.0.0.255 scope global eth0 valid_lft forever preferred_lft forever 70: eth2@if71: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default link/ether 02:42:ac:12:00:03 brd ff:ff:ff:ff:ff:ff link-netnsid 2 inet 172.18.0.3/16 brd 172.18.255.255 scope global eth2 valid_lft forever preferred_lft forever 72: eth1@if73: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue state UP group default link/ether 02:42:0a:14:14:03 brd ff:ff:ff:ff:ff:ff link-netnsid 1 inet 10.20.20.3/24 brd 10.20.20.255 scope global eth1 valid_lft forever preferred_lft foreverVoyons le PeerID de la veth eth1 lié à notre overlay.
$ sudo nsenter -n -t $(pidof -s nginx) ethtool -S eth1 NIC statistics: peer_ifindex: 73On cherche du coup maintenant la veth avec l’index 73, elle doit être dans le namespace de l’overlay.
$ docker network ls | grep mon-overlay-ipsec o2v3e4cf5fro mon-overlay-ipsec overlay swarm $ sudo ls -l /run/docker/netns/ total 0 [...]] -r--r--r-- 1 root root 0 Jun 16 20:16 1-o2v3e4cf5f [...] $ sudo nsenter --net=/run/docker/netns/1-o2v3e4cf5f ip a 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 inet 127.0.0.1/8 scope host lo valid_lft forever preferred_lft forever 2: br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue state UP group default link/ether be:86:9b:82:98:53 brd ff:ff:ff:ff:ff:ff inet 10.20.20.1/24 brd 10.20.20.255 scope global br0 valid_lft forever preferred_lft forever 65: vxlan0@if65: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UNKNOWN group default link/ether e2:fb:73:9d:d7:a2 brd ff:ff:ff:ff:ff:ff link-netnsid 0 67: veth0@if66: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UP group default link/ether be:86:9b:82:98:53 brd ff:ff:ff:ff:ff:ff link-netnsid 1 73: veth1@if72: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UP group default link/ether ea:86:89:7a:9e:f2 brd ff:ff:ff:ff:ff:ff link-netnsid 2On voit ici notre interface veth avec l’index 73, il s’agit de veth1.
Et nous voyons aussi notre interface VXLAN, vxlan0.
veth0 est l’interface du namespace de la VIP du service.
On peut voir l’ID de notre VXLAN avec la commande suivante, ici 4098
$ sudo nsenter --net=/run/docker/netns/1-o2v3e4cf5f ip -d link show vxlan0 65: vxlan0@if65: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1424 qdisc noqueue master br0 state UNKNOWN mode DEFAULT group default link/ether e2:fb:73:9d:d7:a2 brd ff:ff:ff:ff:ff:ff link-netnsid 0 promiscuity 1 vxlan id 4098 srcport 0 0 dstport 4789 proxy l2miss l3miss ttl inherit ageing 300 udpcsum noudp6zerocsumtx noudp6zerocsumrxPour finir, lancer une capture sur l’interface virtuelle veth1 va nous montrer le trafic qui quitte le conteneur.
$ sudo nsenter --net=/run/docker/netns/1-o2v3e4cf5f tcpdump -i veth1 icmp tcpdump: verbose output suppressed, use -v or -vv for full protocol decode listening on veth1, link-type EN10MB (Ethernet), capture size 262144 bytes 23:02:39.989473 IP 10.20.20.3 > 10.20.20.4: ICMP echo request, id 799, seq 61, length 64 23:02:39.989945 IP 10.20.20.4 > 10.20.20.3: ICMP echo reply, id 799, seq 61, length 64 23:02:41.013488 IP 10.20.20.3 > 10.20.20.4: ICMP echo request, id 799, seq 62, length 64 23:02:41.013979 IP 10.20.20.4 > 10.20.20.3: ICMP echo reply, id 799, seq 62, length 64 23:02:42.037832 IP 10.20.20.3 > 10.20.20.4: ICMP echo request, id 799, seq 63, length 64 23:02:42.038311 IP 10.20.20.4 > 10.20.20.3: ICMP echo reply, id 799, seq 63, length 64`,description:"",tags:null,title:"Le réseau Ingress Overlay",uri:"/orchestration/swarm/ingress_overlay/"},{breadcrumb:"Home > Orchestration",content:`Swarmkit Présentation Swarmkit est un ensemble d’outil open-source qui permet de créer un cluster multi-noeuds.
Cet outil fait parti intégrante de Docker.
C’est un système qui fonctionne en mode haute disponibilité basé sur le protocole Raft Ce protocole est robuste et permet une reconfiguration dynamique sans interruption du cluster.
Il est utilisé dans plusieurs projets open-source comme etcd, zookeeper,…
Swarmkit intègre egalement directement le Load-Balancing des services et les réseaux overlay.
Nomenclature Un cluster Swarm est composé d’au moins noeud. Un noeud est soit un manager soit un worker. Les managers s’occupent de la partie Raft et conservent les journaux du Raft. Le cluster est commandé via l’API Swarmkit au travers des managers. Un seul manager fait office de leader, les autres managers ne font que relayer les requêtes. Les workers recoivent les instructions de la part des managers Il est conseillé d’éxécuter le workload sur les workers, bien que les managers peuvent aussi s’en charger. Les managers exposent l’API de Swarm On lance des services via l’API Un service est un objet defini par sont état désiré : une image, combien de replicas, dans quel réseau,… Un service est composé de plusieurs tasks Une tasks corresponds à un conteneur assigné à un noeud Les noeuds connaissent leurs tasks et sont chargé de les démarrer ou les arrêter en conséquence. `,description:"",tags:null,title:"Swarm",uri:"/orchestration/swarm/"},{breadcrumb:"Home > Automatisation d'une image",content:`Pour aller plus loin… Si vous le sentez, vous pouvez créer un repo sur Gihub pour pousser votre Dockerfile créé précédemment.
Puis configurer un build automatique de votre Dockerfile grâce au DockerHub.
`,description:"",tags:null,title:"[Optionel] Github",uri:"/image_automation/github/"},{breadcrumb:"Home > Docker et Linux",content:`Les volumes permettent plusieurs choses:
Passer outre le Copy On Write et utiliser les performances natives des disques. Partager des dossiers et fichiers entre les conteneurs Partager des dossiers et fichiers entre l’hôte et les conteneurs Utiliser des points de montage distant Nous allons voir comment utiliser un volume:
Dans un Dockerfile Au demarrage avec l’option -v En utilisant un volume nommé La persistance des données Illustrons l’état par défaut des données après l’arrêt d’un conteneur
$ docker container run -ti --name c1 alpine shOn va créer un dossier et un fichier à l’intérieur
$ mkdir /mon_dossier && cd /mon_dossier && touch monfichier.txtNous allons maintenant voir que le layer R/W du conteneur n’est pas accessible depuis l’hôte.
Commençons par quitter le conteneur
$ exitOn va inspecter le notre conteneur pour trouver l’emplacement du layer.
On peut utiliser la commande inspect et chercher le mot clef GraphDriver
$ docker container inspect c1On peut egalement utiliser la sortie avancé grâce au Template Go et voir directement l’information.
$ docker container inspect -f '{{ json .GraphDriver }}' c1 | jqVous devriez avoir un output qui ressemble à ça:
{ "Data": { "LowerDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0-init/diff:/var/lib/docker/overlay2/3385f7f394c776c48b391cd6e407816d3026cea3ff9f5526f05d631ff6b4ae55/diff", "MergedDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0/merged", "UpperDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0/diff", "WorkDir": "/var/lib/docker/overlay2/0b144df858ed09133fb9de89026b91cb1a8ecacb1464466cff9479f2267b69a0/work" }, "Name": "overlay2" }Depuis l’hôte, si on regarde l’emplacement du dossier contenu dans la key UpperDir, on peut voir que notre dossier /mon_dossier et notre fichier monfichier.txt sont là.
Executer la commande suivante pour voir le contenu de notre dossier /mon_dossier:
$ ls /var/lib/docker/overlay2/[ID_LAYER]/diff/mon_dossierQue se passe t-il si notre conteneur venait à être supprimé ?
$ docker container rm c1 Information Il semble que le dossier UpperDir ci-dessus, n’existe plus. Pouvez vous le confirmer ?
Essayer de lancer de nouveau un ls
Cela prouve que les données dans un conteneur ne sont pas persistantes, elles sont supprimées en même temps que le conteneur.
Definir un volume dans un Dockerfile Nous allons créér un Dockerfile basé sur alpine et definir /mon_dossier en tant que volume.
Cela signifie que tout ce que sera écrit par un conteneur dans /mon_dossier existera en dehors du layer R/W du conteneur.
Utiliser le Dockerfile suivant:
FROM alpine VOLUME ["/mon_dossier"] ENTRYPOINT ["/bin/sh"] Information On definit ici /bin/sh en Entrypoint afin d’avoir un shell en mode intéractif sans devoir spécifier de commande.
Nous pouvons alors lancer la création de l’image
$ docker image build -t img1 .On peut alors lancer notre conteneur en mode intéractif à partir de cette image.
$ docker container run -ti --name c2 img1 /# On peut donc maintenant aller dans /mon_dossier et créer un fichier.
/# cd /mon_dossier /# touch hello.txt /# ls hello.txtOn peut quitter le conteneur en le laissant tourner en arrière plan.
Il faut utiliser la combinaison de raccourcis : ctrl+P/ctrl+Q
Puis vérifier que le conteneur est toujours actif.
$ docker ps Information Le conteneur c2 devrait être listé
On va alors inspecter ce conteneur pour connaître l’emplacement de notre volume sur la VM.
On va utiliser directement les templates GO mais on pourrait utiliser un docker inspect puis chercher à la main la clef Mount
$ docker inspect -f '{{ json .Mounts }}' c2 | jqVous devriez avoir une sortie qui ressemble à ca:
[ { "Type": "volume", "Name": "2d47da3c88436afa4b35b084ba0060009066b26b042ee7b161b1d3215f1b06fd", "Source": "/var/lib/docker/volumes/2d47da3c88436afa4b35b084ba0060009066b26b042ee7b161b1d3215f1b06fd/_data", "Destination": "/mon_dossier", "Driver": "local", "Mode": "", "RW": true, "Propagation": "" } ]Cette sortie montre que le volume /mon_dossier est situé dans /var/lib/docker/volumes/[ID_VOLUME]/_data
Remplacer le chemin par le votre et vérifier que le fichier hello.txt est bien présent.
On peut maintenant supprimer c2
$ docker rm -f c2Valider que le fichier est toujours disponible à l’emplacement précédent.
Definir un volume en mode intéractif On a vu comment définir un volume via un Dockerfile, on peut aussi le définir au lancement avec l’option -v
Executons un conteneur à partir de l’image alpine, on utilisera l’option -d pour le passer en arrière plan.
Afin que le processus PID1 du conteneur reste actif, on utilise une commande qui pinger 1.1.1.1 en continue et ecrire le résultat dans /mon_dossier.
$ docker run -d --name c3 -v /mon_dossier alpine sh -c 'ping 1.1.1.1 > /mon_dossier/ping.txt'Allons chercher l’emplacement du volume:
$ docker inspect -f '{{ json .Mounts }}' c3 | jqNous avons quasiment la même sortie qu’avec le Dockefile, à l’exception des IDs
[ { "Type": "volume", "Name": "0534a1308b43b5bb7f4f728daeedea7e9962a65b47df4d37e01b2ef89510bd13", "Source": "/var/lib/docker/volumes/0534a1308b43b5bb7f4f728daeedea7e9962a65b47df4d37e01b2ef89510bd13/_data", "Destination": "/mon_dossier", "Driver": "local", "Mode": "", "RW": true, "Propagation": "" } ]Vérifions que le fichier existe bien dans le volume:
$ tail -f /var/lib/docker/volumes/<VOLUME_ID>/_data/ping.txt 64 bytes from 1.1.1.1: seq=11 ttl=59 time=0.807 ms 64 bytes from 1.1.1.1: seq=12 ttl=59 time=0.875 ms 64 bytes from 1.1.1.1: seq=13 ttl=59 time=0.828 ms 64 bytes from 1.1.1.1: seq=14 ttl=59 time=1.101 ms 64 bytes from 1.1.1.1: seq=15 ttl=59 time=1.039 ms 64 bytes from 1.1.1.1: seq=16 ttl=59 time=0.804 ms [...]Le fichier ping.txt est rempli regulièrement par la commande de notre conteneur.
Si on supprime le conteneur, le processus va arrêter de remplir le fichier mais il ne sera psa supprimé.
Utiliser un volume nommé Nous allons utiliser la commande pour créer un volume nommé web.
$ docker volume create --name webSi nous listons les volumes existant, il devrait y avoir notre volume web.
$ docker volume lsL’output devrait ressembler à ça:
DRIVER VOLUME NAME [...]] local webPour les volumes, comme presque tous les objets dans Docker, on peut executer la commande inpect.
$ docker volume inspect web [ { "CreatedAt": "2020-06-14T14:27:06Z", "Driver": "local", "Labels": {}, "Mountpoint": "/var/lib/docker/volumes/web/_data", "Name": "web", "Options": {}, "Scope": "local" } ]Le Mountpoint défini ici est le chemin sur l’hôte ou l’on peut trouver le volume.
On peut voir que le chemin des volumes nommés utilise le nom du volume au lieu de l’ID comme dans les exemples précédents.
On peut maintenant utiliser ce volume et le monter dans un conteneur.
Nous allons utiliser nginx et monter le volume web dans le répertoire /usr/share/nginx/html du conteneur.
Information /usr/share/nginx/html est le répertoire par defaut du serveur nginx. Il contient 2 fichiers : index.html et 50x.html
$ docker run -d --name www -p 8080:80 -v web:/usr/share/nginx/html nginxDepuis l’hôte, allons voir le contenu du volume.
$ ls /var/lib/docker/volumes/web/_data 50x.html index.htmlLe contenu du dossier /usr/share/nginx/html du conteneur www à été copié dans le dossier /var/lib/docker/volumes/html/_data sur l’hôte.
Allons vérifier la page d’accueil de nginx
$ curl 127.0.0.1:8080 <!DOCTYPE html> <html> <head> <title>Welcome to nginx!</title> <style> body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; } </style> </head> <body> <h1>Welcome to nginx!</h1> <p>If you see this page, the nginx web server is successfully installed and working. Further configuration is required.</p> <p>For online documentation and support please refer to <a href="http://nginx.org/">nginx.org</a>.<br/> Commercial support is available at <a href="http://nginx.com/">nginx.com</a>.</p> <p><em>Thank you for using nginx.</em></p> </body> </html>Depuis l’hôte, nous pouvons désormais modifier le fichier index.html et vérifier que nos changements sont bien pris en compte par le conteneur.
$ cat<<END >/var/lib/docker/volumes/web/_data/index.html TOC TOC TOC ! ENDAllons voir de nouveau la page web
$ curl 127.0.0.1:8080 TOC TOC TOC !Nous pouvons voir les changements que nous avons effectués.
Monter un dossier de la VM dans un conteneur. Nous allons maintenant monter un dossier de l’hôte dans un conteneur en faisant un bind-mount avec l’option -v : -v CHEMIN_HOTE:CHEMIN_CONTENEUR
Information CHEMIN_HOTE et CHEMIN_CONTENEUR peuvent être un dossier ou un fichier.
Le chemin sur l’hôte doit exister.
Il y a deux cas bien distincts:
le CHEMIN_CONTENEUR n’existe pas dans le conteneur. le CHEMIN_CONTENEUR existe dans le conteneur. N’existe pas Executer un conteneur alpine en montant le /tmp local dans le dossier /mon_dossier du conteneur.
$ docker run -ti -v /tmp:/mon_dossier alpine shOn arrive dans le shell de notre conteneur. Par défaut, il n’a pas de répertoire /mon_dossier dans l’image alpine.
Quel est l’impact de notre bind mount ?
$ ls /mon_dossierLe répertoire /mon_dossier à été créé dans le conteneur et contient les fichiers de /tmp de la VM.
Nous pouvons maintenant modifier ces fichiers à partir du conteneur ou de l’hôte.
Existe Executer un conteneur nginx en montant le /tmp local dans le dossier /usr/share/nginx/html du conteneur.
$ docker run -ti -v /tmp:/usr/share/nginx/html nginx bashEst ce que les fichiers par défaut index.html et 50x.html sont présents dans le dossier /usr/share/nginx/html du conteneur ?
$ ls /usr/share/nginx/htmlNon.
Le contenu du dossier du conteneur à été remplacé avec le contenu du dossier de l’hôte.
Les bind-mount sont utiles en mode développement car ils permettent, par exemple, de partager le code source de l’hôte avec le conteneur.
`,description:"",tags:null,title:"Les Volumes",uri:"/docker_linux/volumes/"},{breadcrumb:"Home",content:`Chapter 3 L’automatisation de la création d’une image Dans ce chapître, nous allons utiliser les Dockerfile, puis faire un tour d’horizon du DockerHub.
`,description:"",tags:null,title:"Automatisation d'une image",uri:"/image_automation/"},{breadcrumb:"Home > Docker",content:`Le copy-on-write Le copy-on-write ( CoW ) permet de partager les layers des images entre les conteneurs.
Dès que le conteneur à besoin d’ecrire dans un fichier existant dans une image, celui-ci est copié dans le layer en écriture du conteneur puis modifié.
On retrouve ce principe dans les snapshots BTRFS, le provisioning VMwawre,…
Grâce à cela, le demarrage des conteneurs est rapide, pas besoin de copier l’image.
Le système de fichier CoW recommandé et supporté par docker est Overlay2
L’avantage est qu’il est disponible sur tous les kernel linux recents.
Les conteneurs qui ecrivent beaucoup de données vont par contre consommer plus d’espace et seront plus lents, d’autant plus si le fichier à copier est gros. Dans ce cas la, l’utilisation d’un volume est recommandé.
Information Les volumes seront abordés un peu plus tard dans les chapitres.
Démo Lancer 5 conteneurs avec l’image utilisée précédemment ghcr.io/zaggash/random Chercher les IDs des conteneurs fraîchement démarrés. Lancer un shell dans un conteneur puis ajouter un fichier dans /root Inspecter le conteneur avec docker inspect puis chercher dans le json: [...] "GraphDriver": { "Data": { [...] "MergedDir": "[...]", ... Verifier le contenu de ce dossier. Executer la commande mount sur la VM, qu’en concluez vous ? `,description:"",tags:null,title:"Copy-On-Write",uri:"/docker/copy_on_write/"},{breadcrumb:"Home > Introduction",content:`Dans cette partie, nous allons prendre la main sur les VMs et installer Docker qui nous servira tout au long de la suite du TP.
Connection à la VM Dans un premier temps, se connecter en SSH à la VM.
Afin de préparer l’environnement pour la suite, l’installation devra se faire sur les 3 VMs.
ssh [-i private_key] user@hostnameMettre à jour l’OS Afin d’être dans les meilleurs conditions possible et que nos machines soient identiques, commençons par mettre à jour les VMs.
$ sudo apt-get update $ sudo apt-get upgrade -y $ sync && sync && sudo rebootPuis procéder à l’installation des paquets qui nous serviront par la suite.
$ sudo apt-get install -y bridge-utils jq git httpingInstaller Docker La procédure d’installation est bien detaillée sur le site de Docker.
Installer Docker sur Ubuntu Afin d’eviter d’atteindre la limite de telechargements de certaines images du DockerHub, il nous faut ajouter un cache.
Modifier le fichier /etc/docker/daemon.json et ajouter la valeur registry-mirrors, afin de rendre le changement permanent.
{ "registry-mirrors": ["https://<my-docker-mirror-host>"] }Enregistrer le ficher et redemarrer le daemon Docker afin d’appliquer le changement.
TLDR:
$ sudo apt-get install \\ apt-transport-https \\ ca-certificates \\ curl \\ gnupg-agent \\ software-properties-common $ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add - $ sudo apt-key fingerprint 0EBFCD88 $ sudo add-apt-repository \\ "deb [arch=amd64] https://download.docker.com/linux/ubuntu \\ $(lsb_release -cs) \\ stable" $ sudo apt-get update $ sudo apt-get install docker-ce docker-ce-cli containerd.ioVerifier que le daemon est bien lancé
$ sudo systemctl status docker docker.service - Docker Application Container Engine Loaded: loaded (/lib/systemd/system/docker.service; enabled; vendor preset: enabled) Active: active (running) since Thu 2020-06-11 20:29:54 UTC; 9min ago Docs: https://docs.docker.com Main PID: 7807 (dockerd) Tasks: 30 [...]Lancer un premier conteneur Information L’accès à docker est considéré comme un accès root sur le serveur.
C’est pourquoi l’utilisateur “docker” est équivalent à “root”.
Pour simplifier l’execution des commandes et éviter de taper “sudo” devant chaque commande, nous allons ajouter notre utilisateur au groupe “docker”.
$ sudo usermod -a -G docker user[ relancer la connection ssh ]
$ docker run --rm hello-world Hello from Docker! [...]Voilà vous avez executé un premier conteneur…
`,description:"",tags:null,title:"Installer Docker",uri:"/introduction/install_docker/"},{breadcrumb:"Home > Introduction > Architecture",content:`Docker est extrémement lié au Kernel.
Le fonctionnement des conteneurs repose sur les namespaces, les cgroups et le CopyOnWrite.
Mais egalement d’autres aspects liés à la sécurité comme les CAPabilities, seccomp,…
Ceux qui nous intéressent aujourd’hui sont les trois premiers : namespaces, cgroups et le CopyOnWrite.
Information Ces aspects seront abordés au cours des exercices du TP.
Brièvement, les namespaces permettent l’isolation des processus à différent niveaux (PID, User, Network, Mount)
Les Cgroups permettent l’isolation, la limitation de l’utilisation des ressources (Processeur, Memoire, Utilisation Disque)
`,description:"",tags:null,title:"Namespaces/Cgroups/CoW",uri:"/introduction/architecture/namespaces_cgroups/"},{breadcrumb:"Home > Introduction > Pourquoi docker ?",content:`
Une application construite dans une image peut tourner n’importe où.
Cela simplifie la chaine de deploiement et assure que l’application soit la même partout où elle s’execute.
Un conteneur retire les problématiques de dépendances, de différences de paquets entre les OS, de configurations qui différent.
On oublie le fameux: “Moi, ca marche sur ma machine…”
`,description:"",tags:null,title:"Deploiements simplifiés",uri:"/introduction/why_docker/easier_deployments/"},{breadcrumb:"Home > Orchestration",content:`docker-compose est bien pour le développement en locale.
Il existe plusieurs versions de compose-file : https://docs.docker.com/compose/compose-file/ A partir de la version 3, les compose-file.yaml peuvent être utilisé pour les déploiements dans Swarm.
On déploie un compose-file dans swarm avec la commande docker stack deploy -c <mon_compose.yaml> <nom_de_ma_stack>
Dans cette version de compose, une section deploy est intégré est permet de configurer les déploiements.
Une stack simple. En mode service sans la stack, on l’aurait déployé comme ceci docker service create --publish 1234:80 ghcr.io/zaggash/demo-webapp
Maintenant, on va déployer la stack suivante
version: "3.8" services: web: image: ghcr.io/zaggash/demo-webapp ports: - "1234:80"Les stack sont disponibles dans le dossier du TP.
$ cd ~/tp-iut-docker/stacks $ ls -l $ cat webapp.yml $ docker stack deploy -c webapp.yml mon_appLes stacks sont manipulées avec docker stack
Implicitement, il est executé l’equivalent d’un docker service ...
Les stacks sont nommées ( ici web) et ce nom sert de namespace pour notre application.
Vérifier que la stack fonctionne correctement
$ docker stack ps $ docker service ls $ docker service ps mon-app_webNotre application n’est pas exactement la même qu’avec la commande docker service create ...
Chaque stack à son propre réseau overlay par défaut. Les services de la stack sont connectés à cet overlay sauf indication contraire. Les services ont des alias sur le réseau qui utilise leur nom. On appelle un service avec <nom-de-la-stack>_<nom-du-service> Les services ont également un label interne qui désigne la stack à laquelle ils appartiennent. On peut relancer un docker stack deploy ... pour mettre à jour une stack.
Si on modifie un service avec docker service ..., les modifications seront effacées et remplacées lors d’un prochain docker stack deploy ...
Mettre à jour un service. On veut faire un changement dans notre application;, le processus est le suivant:
On modifie le code On crée une nouvelle image On pousse la nouvelle version de l’image On exécute la nouvelle image On va faire une modification de notre webapp.
Allez dans le dossier du TP de l’application
$ cd ~/tp-iut-docker/docker-demoweb/Puis éditer le fichier print_hostname.sh de la manière suivante
#!/usr/bin/env sh echo "Hey, je suis la v2.0, j'affiche mes IPs" > /usr/share/nginx/html/index.html echo "$HOSTNAME" >> /usr/share/nginx/html/index.html echo $(hostname -I) | tr ' ' '\\n' >> /usr/share/nginx/html/index.htmlVous pouvez ensuite construire l’image et la pousser vers votre compte DockerHub.
Sinon les images nécessaire existent déjà sur mon compte, ici ghcr.io/zaggash/demo-webapp:v2
$ docker build -t <votre_id_dockerhub>/demo-webapp:v2 . $ docker login $ docker push <votre_id_dockerhub>/demo-webapp:v2On retourne dans le dossier ~/tp-iut-docker/stacks et on modifie notre stack pour prendre en compte la nouvelle image.
[...] image: ghcr.io/zaggash/demo-webapp:v2 [...]Dans un shell, lancer un curl avec watch pour voir les changements
$ watch -n1 'curl -sL <ip_d_un_noeud>:1234'Enfin on met à jour l’application et on observe.
$ docker stack deploy -c webapp.yml mon-appLes rolling update On va commencer par ajouter des réplicas à notre application.
Puis lancer un changement de version.
$ docker service scale mon-app_web=7 $ docker service update --image ghcr.io/zaggash/demo-webapp:v1 mon-app_webVous pouvez lancer docker events sur un autre shell sur node1.
Avoir un curl sur l’application en continue, aide aussi à visualiser.
Changer les règles de mise à jour On peux changer plusieurs options sur la manière de faire les mises a jour.
Un exemple sur le parallélisme et le nombre de maximum de conteneur en erreur.
$ docker service update --update-parallelism 2 --update-max-failure-ratio .25 mon-app_webIci aucun conteneur n’a été remplacé, nous avons uniquement changé les metadata du service.
On peut les retrouver dans le docker inspect mon-app_web
Dans une stack, ces changements sont représentés par ceci
[...] image: ghcr.io/zaggash/demo-webapp:v2 [...] deploy: replicas: 10 update_config: parallelism: 2 delay: 10sLes rollback A n’importe quel moment, même en cours de mise à jour, on peux faire un retour en arrière.
En modifiant le compose et en faisant un nouveau deploy
En utilisant l’argument --rollback avec docker service update Ou encore avec docker service rollback
Essayons avec notre service
$ docker service rollback mon-app_web Information Que se passe t-il avec notre application ?
Elle n’est pas mise à jour ! Le rollback revient à la dernière définition du service, voir PreviousSpec dans le docker service inspect mon-app_web
Ici nous avions ajouté du parallélisme avec --update-parallelism 2, donc le service est maintenant revenu à une définition sans le parallélisme.
A chaque docker service update, la nouvelle définition du service passe en Spec et le Spec en cours passe en PreviousSpec.
Les Healthcheck et auto-rollback Les healthcheck sont des commandes envoyées à intervalles réguliers, et retourne 1 ou 0.
Elle doivent être rapide car en cas de timeout, le service est déclaré comme non stable.
On peut définir le healthcheck:
Dans le dockerfile
HEALTHCHECK --interval=1s --timeout=3s CMD curl -f http://localhost/ || false Avec la CLI
docker run --health-cmd "curl -f http://localhost/ || false" ...
docker service create --health-cmd "curl -f http://localhost/ || false" ... Dans une stack www: image: ghcr.io/zaggash/demo-webapp:v1 healthcheck: test: "curl -f https://localhost/ || false" timeout: 3sAssocié à un service, on peut effectuer un rollback en cas de timeout du healthcheck avec --update-failure-action rollback.
Voilà un exemple complet:
docker service update \\ --update-delay 5s \\ --update-failure-action rollback \\ --update-max-failure-ratio .25 \\ --update-monitor 5s \\ --update-parallelism 1 \\ --rollback-delay 5s \\ --rollback-failure-action pause \\ --rollback-max-failure-ratio .5 \\ --rollback-monitor 5s \\ --rollback-parallelism 2 \\ --health-cmd "curl -f http://localhost/ || exit 1" \\ --health-interval 2s \\ --health-retries 1 \\ --image image:version serviceDemo On va appliquer ces changements à notre stack.
Tout d’abord, on supprime la stack et on la recrée avec les paramètre de healthcheck et rollback.
$ docker stack rm mon-app $ cd ~/tp-iut-docker/stacks $ docker stack deploy -c webapp+healthcheck.yml mon-appPuis, on doit créer une image qui plante.
$ cd ~/tp-iut-docker/docker-demoweb$Puis on edite le fichier print_hostname.sh
#!/usr/bin/env sh echo "Hey, je suis la v3.0, je plante" > /usr/share/nginx/html/index.html echo "$HOSTNAME" >> /usr/share/nginx/html/index.html echo $(hostname -I) | tr ' ' '\\n' >> /usr/share/nginx/html/index.html sed -i 's/listen.*80;/listen 81;/' /etc/nginx/conf.d/default.confAvec ce changement, le service fonctionnera correctement mais l’application n’acceptera pas de connection, le healthcheck va donc planter.
On build et on push.
$ docker build -t <votre_id_dockerhub>/demo-webapp:v3 . $ docker login $ docker push <votre_id_dockerhub>/demo-webapp:v3et enfin on test notre v3
$ docker service update --image <votre_id_dockerhub>/demo-webapp:v3 mon-app_webObserver les actions avec un shell qui execute docker events.
Puis un autre shell avec le curl en boucle.
$ watch -n1 'curl -sL <ip_d_un_noeud>:1234'On voit que le service n’est jamais interrompu et que Swarm détecte le conteneur défectueux. Puis au final, le service reste sur notre v2.
`,description:"",tags:null,title:"Les Stacks",uri:"/orchestration/stacks/"},{breadcrumb:"Home > Orchestration > Swarm",content:` Information Pour commencer cette partie, on fait le ménage.
docker service rm $(docker service ls -q)
Nous allons maintenant reprendre l’application Dockercoin et la faire tourner dans notre cluster.
Nous allons construire les images, les envoyer sur le hub, puis les exécuter dans le cluster.
Ici nous sommes obligé d’envoyer les images dans un registry.
Avec la commande docker-compose up, toutes les images de nos services sont construite en local.
Mais pour maintenant, nous avons besoin que ces images soit distribuées entre tous les noeuds du cluster.
Le workflow ressemble un peu ça:
docker build … docker push … docker service create … Astuce Pour plus de simplicité, nous allons envoyer les images sur le dockerhub.
Mais il serait possible de créer son propre registry ou de les envoyer dans un registry privé.
Build and Ship Pour se connecter au DockerHub et pouvoir envoyer les images, ne pas oublier de se logguer avec docker login
Puis ensuite se rendre dans le dossier ou vous avez cloné le dépôt GitHub du TP.
cd ~/tp-iut-docker/dockercoins/ export REGISTRY=docker.io export USER_NAMESPACE=<votre_dockerhub_id> export TAG=v1.0 for SERVICE in hasher rng webui worker; do docker build -t $REGISTRY/$USER_NAMESPACE/$SERVICE:$TAG ./$SERVICE docker push $REGISTRY/$USER_NAMESPACE/$SERVICE:$TAG doneRun Préparer l’overlay Rappelez-vous, nos services ont besoin de communiquer entre eux.
Pour cela, nous allons avoir besoin d’un réseau overlay pour passer d’un noeud à l’autre.
$ docker network create --driver overlay dockercoins $ docker network ls Astuce Bien spécifier –driver overlay autrement un bridge est créé par défaut.
Les services On commence par déployer Redis, on utilise ici l’image officiel.
$ docker service create --network dockercoins --name redis redisPuis on démarre les autres services un par un en utilisant les images envoyées just avant.
export REGISTRY=docker.io export USER_NAMESPACE=<votre_dockerhub_id> export TAG=v1.0 for SERVICE in hasher rng webui worker; do docker service create --network dockercoins --detach=true \\ --name $SERVICE $REGISTRY/$USER_NAMESPACE/$SERVICE:$TAG donePublier le port de la Webui Nous avons besoin de se connecter à la webui, mais nous n’avons publié aucun port.
$ docker service ps webui $ docker service update webui --publish-add 8000:80 $ docker service ps webui Astuce On peut également supprimer un port publié avec --publish-rm
On voit que le premier déploiement a été supprimé puis remplacé par la nouvelle version avec le port publié.
L’application est maintenant disponible sur le port 8000.
Vous pouvez ouvrir votre navigateur sur le port 8000 de n’importe quel noeud du cluster.
Sale Up Workers On peut également ajouter des worker comme avec docker-compose
$ docker service update worker --replicas 15 // OU $ docker service scale worker=10Nous voilà dans la même situation que tout à l’heure avec docker-compose mais cette fois au sein d’un cluster de 3 machines.
Vous pouvez vérifier sur la webui que la vitesse à bien augmentée.
rng Nous avions vu que le service rng était le point bloquant.
Il nous faut maximiser l’entropie pour augmenter la génération de hash pour nos worker.
Pour cela, on va lancer une instance du service rng sur chaque noeud.
Swarmkit à prévu ce genre de déploiement, mais nous devons recréer le service, on ne peux pas activer/désactiver un deploiement globale.
// On supprime le service $ docker service rm rng // Puis on le relance en activant l\\'ordonnancement global $ docker service create --name rng --network dockercoins --mode global \\ $REGISTRY/$USER_NAMESPACE/rng:$TAG`,description:"",tags:null,title:"Retour sur notre Application",uri:"/orchestration/swarm/multi_services_app/"},{breadcrumb:"Home",content:`Chapter 4 Docker et Linux Dans cette partie, nous allons voir comment Docker s’intègre avec linux au niveau réseau puis la gestion des volumes.
`,description:"",tags:null,title:"Docker et Linux",uri:"/docker_linux/"},{breadcrumb:"Home > Introduction > Pourquoi docker ?",content:`Les applications étaient principalement toutes installées sur des Machines Virtuelles.
Certaines fois plusieurs applications partagent la même VM avec ses propres librairies, dépendances, fichiers de configurations…
Les installations se sont ensuite automatisées avec Ansible, Chef, Puppet,… mais il est très facile de modifier un fichier directement sur la machine sans changer le template.
Ce qui rend les environnements certaines fois non fiable.
Les Ops et Dev n’ont pas forcement une manière simple de partager les applications.
Les environnements varient ce qui crée des lenteurs et des frictions entre Dev et Ops.
`,description:"",tags:null,title:"Avant Docker",uri:"/introduction/why_docker/before_docker/"},{breadcrumb:"Home",content:`Chapter 5 Orchestration Cette partie met en oeuvre l’ensemble de la stack de Docker.
Nous allons utiliser docker-compose dans un premier temps. Puis mettre en oeuvre un cluster Swarm.
`,description:"",tags:null,title:"Orchestration",uri:"/orchestration/"},{breadcrumb:"Home > Introduction > Pourquoi docker ?",content:`Les applications sont désormais deployées seules dans une image avec les dependances et configurations.
Dev et Prod peuvent facilement echanger l’application et la deployer en Production.
Les mises à jour ne neccessitent plus une reinstallation mais seulement un changement d’image.
De la même maniere, il est désormais très simple de revenir à une version précédente.
`,description:"",tags:null,title:"Après Docker",uri:"/introduction/why_docker/after_docker/"},{breadcrumb:"Home > Introduction > Pourquoi docker ?",content:`La plupart du temps, les conteneurs tournent dans des VMs.
Les applications profitent des bénéfices de la contenerisation et la flexibilité des VMs.
Faire tourner des conteneurs dans une machine complétement physique ajoute des problématiques de scalabilitée.
Il n’y a pas de vérité, tout est une question de besoin !
VM Conteneur Lourd, dans l’ordre du Giga Léger, dans l’ordre du Mega Overhead de l’hyperviseur Performance native de l’hôte Chaque VMs à son propre OS Les conteneurs partagent l’OS de l’hôte Virtualisation Hardware Virtualisation de l’OS Démarrage dans l’ordre de la minute Démarrage de l’ordre de la milliseconde Isolation complète, donc plus sécrisée Isolation au niveau du processus, potentiellement moins sécurisée `,description:"",tags:null,title:"Alors, VM ou Conteneur ?",uri:"/introduction/why_docker/vm_container/"},{breadcrumb:"",content:`Home Ceci est un TP afin de découvrir Docker, les conteneurs et l’orchestration de conteneur.
J’ai essayé de mettre le plus d’informations possible dans les chapitres.
N’hésitez à m’interpeller si vous rencontrez un problème, une erreur, ou avez besoin de plus d’explications.
La documentation sur le site de Docker peut apporter une aide complémentaire.
Afin de mener à bien le TP, vous avez à votre disposition 3 VMs.
Seule une sera utile jusqu’à la partie concernant l’orchestration.
Ceci n’a pas pour but de tout expliquer sur les conteneurs, mais fait plutôt office d’introduction.
Amusez-vous !
`,description:"",tags:null,title:"Home",uri:"/"},{breadcrumb:"Home",content:"",description:"",tags:null,title:"Categories",uri:"/categories/"},{breadcrumb:"Home",content:"",description:"",tags:null,title:"Tags",uri:"/tags/"}]