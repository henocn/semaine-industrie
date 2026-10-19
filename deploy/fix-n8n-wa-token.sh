#!/usr/bin/env bash
# Sync WHATSAPP_TOKEN from industrie API .env into n8n, test Graph send, restart n8n.
set -euo pipefail

API_ENV=/var/www/semaine-industrie/backend/.env
N8N_ENV=/root/n8n/n8n/.env
PHONE_ID=1454431384412339
TEST_TO=22870815285

TOKEN=$(grep '^WHATSAPP_TOKEN=' "$API_ENV" | head -1 | cut -d= -f2-)
if [[ -z "$TOKEN" || ${#TOKEN} -lt 40 ]]; then
  echo "WHATSAPP_TOKEN manquant dans $API_ENV"
  exit 1
fi
echo "token_len=${#TOKEN}"

CODE=$(curl -s -o /tmp/wa_send.json -w '%{http_code}' \
  -X POST "https://graph.facebook.com/v21.0/${PHONE_ID}/messages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"messaging_product\":\"whatsapp\",\"to\":\"${TEST_TO}\",\"type\":\"text\",\"text\":{\"body\":\"Test SI2026 token OK\"}}")
echo "graph_status=${CODE}"
head -c 220 /tmp/wa_send.json; echo

if [[ "$CODE" != "200" ]]; then
  echo "Token API invalide aussi — regenerer un jeton Meta avant de continuer."
  exit 1
fi

# Upsert dans .env n8n
grep -v -E '^(WHATSAPP_TOKEN|N8N_BLOCK_ENV_ACCESS_IN_NODE)=' "$N8N_ENV" > /tmp/n8n.env.tmp
printf 'WHATSAPP_TOKEN=%s\n' "$TOKEN" >> /tmp/n8n.env.tmp
printf 'N8N_BLOCK_ENV_ACCESS_IN_NODE=false\n' >> /tmp/n8n.env.tmp
mv /tmp/n8n.env.tmp "$N8N_ENV"
chmod 600 "$N8N_ENV"
echo "n8n .env updated (WHATSAPP_TOKEN + unblock env access)"

cd /root/n8n/n8n
docker compose up -d n8n
sleep 6
curl -s -o /dev/null -w 'n8n_local=%{http_code}\n' http://127.0.0.1:5678/ || true
docker ps --format '{{.Names}} {{.Status}}' | grep n8n-n8n || true
echo OK
