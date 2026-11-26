#!/usr/bin/env bash
# Déploiement / mise à jour de baby-krebs-client sur la VM.
# Usage : ./deploy.sh (depuis n'importe quel dossier)
#
# Le code est mis à jour en amont (par RoPloy) : ce script ne fait aucune
# commande git, il reconstruit et redémarre seulement les conteneurs.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env.prod ]; then
  echo "Erreur : .env.prod introuvable (voir DEPLOY.md)." >&2
  exit 1
fi

echo "==> Build (images de base à jour) + démarrage du conteneur"
# --pull : re-télécharge les images de base pour récupérer les patchs de sécurité
docker compose -f docker-compose.prod.yml --env-file .env.prod build --pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "==> État du conteneur"
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

echo "==> Dernières lignes de logs"
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=30 client

echo "==> Déploiement terminé."
