#!/usr/bin/env bash
# Usage: bash deploy/set-wa-token.sh 'EAAxxxx...'
set -euo pipefail
TOKEN="${1:-}"
if [[ -z "$TOKEN" || ${#TOKEN} -lt 40 ]]; then
  echo "Usage: bash deploy/set-wa-token.sh 'EAA...'"
  exit 1
fi
ENVF=/var/www/semaine-industrie/backend/.env
N8N_ENV=/root/n8n/n8n/.env

# Upsert API .env
tmp=$(mktemp)
grep -v '^WHATSAPP_TOKEN=' "$ENVF" >"$tmp"
printf 'WHATSAPP_TOKEN=%s\n' "$TOKEN" >>"$tmp"
mv "$tmp" "$ENVF"
chmod 600 "$ENVF"

# Upsert n8n .env
tmp=$(mktemp)
grep -v -E '^(WHATSAPP_TOKEN|N8N_BLOCK_ENV_ACCESS_IN_NODE)=' "$N8N_ENV" >"$tmp"
printf 'WHATSAPP_TOKEN=%s\n' "$TOKEN" >>"$tmp"
printf 'N8N_BLOCK_ENV_ACCESS_IN_NODE=false\n' >>"$tmp"
mv "$tmp" "$N8N_ENV"
chmod 600 "$N8N_ENV"

CODE=$(curl -s -o /tmp/wa_tok.json -w '%{http_code}' \
  -X POST 'https://graph.facebook.com/v21.0/1454431384412339/messages' \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"messaging_product":"whatsapp","to":"22870815285","type":"text","text":{"body":"Nouveau jeton WhatsApp OK"}}')
echo "graph_status=${CODE}"
head -c 200 /tmp/wa_tok.json; echo
if [[ "$CODE" != "200" ]]; then
  echo "Token invalide"
  exit 1
fi

pm2 restart industrie-api --update-env
sleep 3
curl -fsS -X POST http://127.0.0.1:3005/api/v1/whatsapp/send \
  -H 'Content-Type: application/json' \
  -H 'x-wa-secret: si2026-wa-verify' \
  -d '{"to":"22870815285","body":"API send OK avec nouveau jeton","phoneNumberId":"1454431384412339"}'
echo
echo OK
