#!/usr/bin/env bash
# Déploie uniquement le backend WhatsApp (pas de npm ci ni reset agressif inutiles).
set -euo pipefail
APP_ROOT=/var/www/semaine-industrie
cd "$APP_ROOT"
git fetch origin
git reset --hard origin/main
cd "$APP_ROOT/backend"
# Pas de npm ci : dépendances déjà en place
pm2 restart industrie-api --update-env
ok=0
for i in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:3005/api/v1/health >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 1
done
if [[ "$ok" != "1" ]]; then
  pm2 logs industrie-api --lines 30 --nostream || true
  exit 1
fi
# Test send local (secret verify token)
curl -fsS -X POST http://127.0.0.1:3005/api/v1/whatsapp/send \
  -H 'Content-Type: application/json' \
  -H 'x-wa-secret: si2026-wa-verify' \
  -d '{"to":"22870815285","body":"Bot n8n → API OK","phoneNumberId":"1454431384412339"}' | head -c 300
echo
echo OK
