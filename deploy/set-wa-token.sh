#!/usr/bin/env bash
# Installe WHATSAPP_TOKEN sur l'API (+ n8n) et redémarre proprement PM2.
#
# Jeton PERMANENT (recommandé) :
# 1. business.facebook.com > Paramètres Business > Utilisateurs > Utilisateurs système
# 2. Créer / ouvrir un utilisateur système (rôle Admin)
# 3. Ajouter les actifs : appli « Industrie TOGO » + compte WhatsApp Business
# 4. Générer un jeton : jamais d'expiration
#    permissions : whatsapp_business_messaging, whatsapp_business_management
# 5. bash deploy/set-wa-token.sh 'EAA...'
#
# Les jetons Graph Explorer expirent ~24h : à éviter en prod.
#
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

# PM2 garde parfois un ancien WHATSAPP_TOKEN en process.env (dotenv ne l'écrase pas).
# Delete + start force le rechargement depuis backend/.env uniquement.
pm2 delete industrie-api || true
pm2 start /var/www/semaine-industrie/backend/server.js \
  --name industrie-api \
  --cwd /var/www/semaine-industrie/backend
pm2 save
sleep 4
curl -fsS -X POST http://127.0.0.1:3005/api/v1/whatsapp/send \
  -H 'Content-Type: application/json' \
  -H 'x-wa-secret: si2026-wa-verify' \
  -d '{"to":"22870815285","body":"API send OK avec nouveau jeton","phoneNumberId":"1454431384412339"}'
echo

# Recharge n8n pour prendre WHATSAPP_TOKEN (si le workflow Graph l'utilise encore)
if [ -d /root/n8n/n8n ]; then
  (cd /root/n8n/n8n && docker compose up -d n8n) || true
fi
echo OK
