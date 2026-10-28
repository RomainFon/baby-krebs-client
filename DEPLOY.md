# Déploiement — baby-krebs-client

Domaine : **https://baby-footenor.tenorsolutions.com**. Ce service sert le SPA et
tout le trafic du domaine, sauf `/api` et `/sanctum` (routés vers
baby-krebs-api).

Prérequis : DNS, deploy key et alias SSH `github-baby-krebs-client` en place,
et **baby-krebs-api déjà lancée**. Voir le `DEPLOY.md` de l'API, étapes 0 à 6.

## Cloner et lancer

```bash
cd /srv/apps
git clone git@github-baby-krebs-client:RomainFon/baby-krebs-client.git
cd baby-krebs-client
cp .env.prod.example .env.prod      # domaine déjà prérempli
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Aucun secret côté client : `.env.prod` ne contient que le domaine, utilisé par
les labels Traefik.

## Vérifier

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs client
```

Ouvrir https://baby-footenor.tenorsolutions.com : l'accueil doit s'afficher. Le
premier certificat Let's Encrypt peut prendre quelques secondes.

## Mise à jour

La mise à jour du code (git) est faite par **RoPloy**. Une fois le code à
jour, `deploy.sh` reconstruit et redémarre le conteneur. Le script ne fait
aucune commande git.

```bash
cd /srv/apps/baby-krebs-client && ./deploy.sh
```
