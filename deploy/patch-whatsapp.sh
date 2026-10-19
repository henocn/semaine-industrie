#!/usr/bin/env bash
# À lancer sur le VPS (même machine que industrie-api / n8n).
# Usage :
#   export WHATSAPP_TOKEN='EAA...'
#   bash deploy/patch-whatsapp.sh
#
# Puis dans Meta (Industrie TOGO → Webhooks → WhatsApp Business Account) :
#   URL : https://semaineindustrie.tg/api/v1/whatsapp/webhook
#   Verify token : si2026-wa-verify
#   Champ messages : Abonné

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/semaine-industrie}"
ENV_FILE="$APP_ROOT/backend/.env"
PHONE_ID="${WHATSAPP_PHONE_NUMBER_ID:-1454431384412339}"
VERIFY="${WHATSAPP_VERIFY_TOKEN:-si2026-wa-verify}"

if [[ -z "${WHATSAPP_TOKEN:-}" ]]; then
  echo "Définis WHATSAPP_TOKEN avant (jeton Meta WhatsApp)."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Introuvable : $ENV_FILE"
  exit 1
fi

cd "$APP_ROOT"
echo "==> git pull / reset origin/main"
git fetch origin
git reset --hard origin/main

# Upsert des clés WhatsApp dans .env
upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$val" >>"$ENV_FILE"
  fi
}

upsert_env WHATSAPP_TOKEN "$WHATSAPP_TOKEN"
upsert_env WHATSAPP_PHONE_NUMBER_ID "$PHONE_ID"
upsert_env WHATSAPP_VERIFY_TOKEN "$VERIFY"

echo "==> npm ci + restart API"
cd "$APP_ROOT/backend"
npm ci --omit=dev
cd "$APP_ROOT"
pm2 restart industrie-api

echo "==> test health + webhook challenge"
curl -fsS "http://127.0.0.1:3005/api/v1/health" | head -c 200
echo
CHAL=$(curl -fsS "http://127.0.0.1:3005/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=12345")
echo "challenge=$CHAL"
if [[ "$CHAL" != "12345" ]]; then
  echo "Échec verify local"
  exit 1
fi

echo "OK — configure Meta webhook vers https://semaineindustrie.tg/api/v1/whatsapp/webhook"
echo "Verify token : $VERIFY"
