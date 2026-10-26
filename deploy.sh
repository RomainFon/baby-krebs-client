#!/usr/bin/env bash
# Déploiement / mise à jour de baby-krebs-client sur la VM.
# Usage : ./deploy.sh (depuis n'importe quel dossier)

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ -n "$(git status --porcelain)" ]; then
  echo "Erreur : des modifications locales non commitées existent dans ce dossier." >&2
  echo "Vérifie 'git status' avant de redéployer (le script ne veut pas les écraser)." >&2
  exit 1
fi

echo "==> git pull"
git pull

echo "==> Build + démarrage du conteneur"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "==> État du conteneur"
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

echo "==> Dernières lignes de logs"
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=30 client

echo "==> Déploiement terminé."
