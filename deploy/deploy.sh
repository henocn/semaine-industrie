#!/usr/bin/env bash
# Déploiement courant (après setup + .env renseigné).
# Écrase FORCÉMENT l'état local git (package-lock, etc.) avec origin.
# Usage :
#   cd /var/www/semaine-industrie
#   bash deploy/deploy.sh
#
# Variables : APP_ROOT, DEPLOY_BRANCH (défaut = branche courante)

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/semaine-industrie}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$REPO_ROOT" != "$APP_ROOT" ]]; then
  echo "Le script doit tourner depuis le clone dans $APP_ROOT (actuel: $REPO_ROOT)"
  exit 1
fi

cd "$APP_ROOT"

if [[ ! -f backend/.env ]]; then
  echo "Manque backend/.env — lancez d'abord deploy/setup.sh puis remplissez les secrets."
  exit 1
fi

BRANCH="${DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
if [[ "$BRANCH" == "HEAD" ]]; then
  echo "Détaché du HEAD — définir DEPLOY_BRANCH=main (ou la branche voulue)"
  exit 1
fi

echo "==> Git : écrasement local → origin/$BRANCH"
git fetch origin
git reset --hard "origin/$BRANCH"
# Fichiers non suivis (sauf ignorés : .env, uploads, logs, node_modules)
git clean -fd

echo "==> Frontend : install + build"
cd "$APP_ROOT/frontend"
npm ci
npm run build

echo "==> Backend : install"
cd "$APP_ROOT/backend"
npm ci --omit=dev

echo "==> Uploads / logs (droits)"
mkdir -p uploads/labels logs
chmod -R u+rwX,g+rX,o+rX uploads logs 2>/dev/null || true

echo "==> Migrations"
npm run db:migrate

echo "==> Seed superadmin unique"
npm run db:seed:superadmin

echo "==> PM2 restart industrie-api"
cd "$APP_ROOT"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 introuvable — relancer sudo bash deploy/setup.sh"
  exit 1
fi
if pm2 describe industrie-api >/dev/null 2>&1; then
  pm2 restart industrie-api --update-env
else
  pm2 start deploy/ecosystem.config.cjs --only industrie-api
fi
pm2 save

echo "==> Healthcheck"
sleep 1
curl -fsS "http://127.0.0.1:3005/api/v1/health" | head -c 200
echo

if command -v nginx >/dev/null 2>&1; then
  echo "==> Nginx reload"
  sudo nginx -t && sudo systemctl reload nginx || true
fi

echo "OK — https://semaineindustrie.tg (API pm2:industrie-api @:3005)"
