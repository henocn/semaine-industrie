#!/usr/bin/env bash
# Déploiement VPS (manuel ou forced command SSH de la clé CI).
# Vite build → frontend/dist (Nginx), migrations Sequelize, PM2 industrie-api.
#
# Usage :
#   bash deploy/deploy.sh
#   # ou forcé : command="/home/deploy/deploy.sh" dans authorized_keys
#
# Variables : APP_ROOT / DEPLOY_DIR (défaut /var/www/semaine-industrie),
#             DEPLOY_BRANCH (défaut main), LOG, LOCK
#
# Rollback git + rebuild si le healthcheck échoue.
# Les migrations DB ne sont PAS annulées automatiquement.

set -euo pipefail

APP_ROOT="${APP_ROOT:-${DEPLOY_DIR:-/var/www/semaine-industrie}}"
BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP="${PM2_APP:-industrie-api}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3005/api/v1/health}"
LOCK="${LOCK:-/tmp/si-deploy.lock}"
LOG="${LOG:-/home/deploy/deploy.log}"


# Redirige stdout/stderr vers le journal (et le terminal).
setup_logging() {
  mkdir -p "$(dirname "$LOG")"
  touch "$LOG"
  exec > >(tee -a "$LOG") 2>&1
}


# Prend un verrou exclusif non bloquant (un seul deploy à la fois).
acquire_lock() {
  exec 9>"$LOCK"
  if ! flock -n 9; then
    echo "Déploiement déjà en cours (lock $LOCK)"
    exit 1
  fi
}


# Build frontend, install backend, migrate, seed superadmin, restart PM2.
# Ne touche pas aux fichiers .env. Pas de sudo / nginx reload (dist statique).
build_and_restart() {
  echo "==> Frontend : npm ci + build"
  cd "$APP_ROOT/frontend"
  npm ci
  npm run build

  echo "==> Backend : npm ci --omit=dev"
  cd "$APP_ROOT/backend"
  npm ci --omit=dev

  echo "==> Uploads / logs"
  mkdir -p uploads/labels uploads/products logs
  chmod -R u+rwX,g+rX,o+rX uploads logs 2>/dev/null || true

  echo "==> Migrations"
  npm run db:migrate

  echo "==> Seed superadmin unique"
  npm run db:seed:superadmin

  echo "==> PM2 restart $PM2_APP"
  cd "$APP_ROOT"
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "pm2 introuvable"
    return 1
  fi
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    # Secrets uniquement via backend/.env (dotenv), pas via env PM2.
    pm2 restart "$PM2_APP"
  else
    pm2 start deploy/ecosystem.config.cjs --only "$PM2_APP"
  fi
  pm2 save
}


# Healthcheck local : 15 tentatives, une toutes les 2 s.
health() {
  local i
  echo "==> Healthcheck $HEALTH_URL (15 × 2s)"
  for i in $(seq 1 15); do
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null; then
      echo "    OK (tentative $i)"
      curl -fsS --max-time 5 "$HEALTH_URL" | head -c 200
      echo
      return 0
    fi
    sleep 2
  done
  return 1
}


# Remet le commit précédent, rebuild + PM2, re-check.
# NB : les migrations DB déjà appliquées ne sont PAS annulées.
rollback() {
  local prev="$1"
  echo "!! Échec — rollback git vers $prev"
  echo "!! NB : les migrations DB ne sont PAS annulées automatiquement."
  cd "$APP_ROOT"
  git reset --hard "$prev"
  # .env / uploads gitignorés restent en place
  build_and_restart || true
  if health; then
    echo "Rollback OK (code app = $prev) — schéma DB éventuellement en avance"
  else
    echo "!! Rollback KO — intervention manuelle requise"
  fi
  exit 1
}


# Point d'entrée du déploiement.
main() {
  setup_logging
  acquire_lock

  echo "===== $(date -u +%Y-%m-%dT%H:%M:%SZ) déploiement ====="
  echo "APP_ROOT=$APP_ROOT BRANCH=$BRANCH"

  cd "$APP_ROOT"
  [[ -d .git ]] || { echo "Pas un dépôt git : $APP_ROOT"; exit 1; }
  [[ -f backend/.env ]] || {
    echo "Manque backend/.env — setup une fois (deploy/setup.sh), ce script ne le crée pas."
    exit 1
  }

  PREV="$(git rev-parse HEAD)"
  echo "Commit précédent : $PREV"

  echo "==> Git : fetch + reset --hard origin/$BRANCH"
  git fetch --prune origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
  # Préserve .env, uploads, logs (gitignored).
  git clean -fd
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "ATTENTION: working tree encore sale après reset :"
    git status --short | head -40
    exit 1
  fi
  echo "Nouveau commit : $(git rev-parse HEAD)"

  # set -e + return codes : échec build/health → rollback
  if ! build_and_restart; then
    rollback "$PREV"
  fi
  if ! health; then
    rollback "$PREV"
  fi

  echo "OK — déployé $(git rev-parse --short HEAD) (pm2:$PM2_APP @:3005)"
}


main "$@"
