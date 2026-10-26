# Déploiement — baby-krebs-client

Prérequis : Traefik du projet `infra` et **baby-krebs-api déjà lancée** (voir
son `DEPLOY.md`).

```bash
cd /srv/apps
git clone git@github-baby-krebs-client:RomainFon/baby-krebs-client.git
cd baby-krebs-client
cp .env.prod.example .env.prod      # renseigner BABY_KREBS_DOMAIN
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Vérifier : `https://<domaine>` affiche le site et `https://<domaine>/api/session`
répond `{"data":null}`.

## Mise à jour

```bash
./deploy.sh
```
