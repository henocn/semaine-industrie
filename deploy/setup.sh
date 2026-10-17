#!/usr/bin/env bash
# Première installation sur le VPS (une fois).
# Prérequis : repo cloné dans APP_ROOT (ex. /var/www/semaine-industrie)
# Usage :
#   cd /var/www/semaine-industrie
#   sudo bash deploy/setup.sh
#
# Ensuite : créer la BDD + user Postgres, remplir backend/.env, puis :
#   bash deploy/deploy.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/semaine-industrie}"
NGINX_SITE="/etc/nginx/sites-available/semaineindustrie.tg"
NGINX_ENABLED="/etc/nginx/sites-enabled/semaineindustrie.tg"
DEPLOY_USER="${SUDO_USER:-${USER}}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Lancer avec sudo : sudo bash deploy/setup.sh"
  exit 1
fi

if [[ ! -d "$APP_ROOT/.git" ]]; then
  echo "Le repo git doit être dans $APP_ROOT (git clone … $APP_ROOT)"
  exit 1
fi

if [[ ! -f "$APP_ROOT/deploy/nginx/semaineindustrie.tg" ]]; then
  echo "Fichier Nginx introuvable dans le repo."
  exit 1
fi

echo "==> Dossiers applicatifs"
mkdir -p "$APP_ROOT/backend/uploads/labels"
mkdir -p "$APP_ROOT/backend/logs"
mkdir -p "$APP_ROOT/frontend/dist"

echo "==> Droits uploads / logs (user: $DEPLOY_USER)"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/backend/uploads" "$APP_ROOT/backend/logs"
chmod -R u+rwX,g+rX,o+rX "$APP_ROOT/backend/uploads"
chmod -R u+rwX,g+rX,o+rX "$APP_ROOT/backend/logs"
# nginx lit le front
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/frontend"
find "$APP_ROOT/frontend" -type d -exec chmod 755 {} \;
find "$APP_ROOT/frontend" -type f -exec chmod 644 {} \; 2>/dev/null || true

echo "==> .env production (si absent)"
if [[ ! -f "$APP_ROOT/backend/.env" ]]; then
  cp "$APP_ROOT/deploy/env.production.example" "$APP_ROOT/backend/.env"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/backend/.env"
  chmod 600 "$APP_ROOT/backend/.env"
  echo "    → créé $APP_ROOT/backend/.env — à compléter (DB + secrets + SUPERADMIN_PASSWORD)"
else
  echo "    → déjà présent, non écrasé"
fi

echo "==> PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "    Installation pm2 (npm i -g pm2)…"
  npm install -g pm2
fi

# Enregistre le process (peut échouer si deps/DB pas encore prêts — OK)
sudo -u "$DEPLOY_USER" bash -c "
  cd '$APP_ROOT'
  if pm2 describe industrie-api >/dev/null 2>&1; then
    pm2 reload deploy/ecosystem.config.cjs --only industrie-api || true
  else
    pm2 start deploy/ecosystem.config.cjs --only industrie-api || true
  fi
  pm2 save || true
"

echo "==> Nginx → $NGINX_SITE (écrasement)"
cp "$APP_ROOT/deploy/nginx/semaineindustrie.tg" "$NGINX_SITE"
ln -sfn "$NGINX_SITE" "$NGINX_ENABLED"
# Anciens noms éventuels
rm -f /etc/nginx/sites-enabled/semaine-industrie 2>/dev/null || true

nginx -t
systemctl reload nginx

cat <<EOF

============================================================
Setup OK.

Étapes suivantes (à la main) :
  1) Créer la base et l'utilisateur Postgres, ex. :
       sudo -u postgres psql
       CREATE USER semaine_industrie WITH PASSWORD '…';
       CREATE DATABASE semaine_industrie OWNER semaine_industrie;
  2) Éditer $APP_ROOT/backend/.env
       → DB_*, JWT_ACCESS_SECRET, SUPERADMIN_PASSWORD, etc.
  3) Lancer le premier déploiement :
       cd $APP_ROOT && bash deploy/deploy.sh

API PM2 : industrie-api · port 3005
Site Nginx : https://semaineindustrie.tg

Astuce : pour démarrer PM2 au boot (une fois) :
  sudo env PATH=\$PATH pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER
  sudo -u $DEPLOY_USER pm2 save
============================================================
EOF
