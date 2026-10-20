#!/usr/bin/env bash
# Crée les templates WhatsApp (acceptation + rappels) sur le WABA.
#
# Prérequis : WHATSAPP_TOKEN avec whatsapp_business_management
# Usage :
#   bash deploy/create-wa-templates.sh
#   WHATSAPP_TOKEN='EAA...' WABA_ID='2387...' bash deploy/create-wa-templates.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVF="${ENVF:-/var/www/semaine-industrie/backend/.env}"
JSON="${ROOT}/deploy/whatsapp-templates.json"
GRAPH="https://graph.facebook.com/v21.0"

TOKEN_FROM_ENV=""
WABA_FROM_ENV=""
if [[ -f "$ENVF" ]]; then
  TOKEN_FROM_ENV=$(grep -E '^WHATSAPP_TOKEN=' "$ENVF" | head -1 | cut -d= -f2- || true)
  WABA_FROM_ENV=$(grep -E '^WHATSAPP_WABA_ID=' "$ENVF" | head -1 | cut -d= -f2- || true)
fi

TOKEN="${WHATSAPP_TOKEN:-${TOKEN_FROM_ENV:-}}"
WABA_ID="${WABA_ID:-${WHATSAPP_WABA_ID:-${WABA_FROM_ENV:-2387848361959787}}}"

if [[ -z "$TOKEN" || ${#TOKEN} -lt 40 ]]; then
  echo "WHATSAPP_TOKEN manquant"
  exit 1
fi
if [[ ! -f "$JSON" ]]; then
  echo "Fichier introuvable: $JSON"
  exit 1
fi

echo "WABA=${WABA_ID}"
python3 - "$JSON" "$GRAPH" "$WABA_ID" "$TOKEN" <<'PY'
import json, sys, urllib.request, urllib.error

path, graph, waba, token = sys.argv[1:5]
data = json.load(open(path, encoding="utf-8"))
print(f"templates={len(data['templates'])}")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}

for tpl in data["templates"]:
    name = tpl["name"]
    body = json.dumps(tpl).encode("utf-8")
    url = f"{graph}/{waba}/message_templates"
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read().decode("utf-8", "replace")
            print(f"OK {name} -> {raw[:300]}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        low = raw.lower()
        if "already exists" in low or "object with this name already exists" in low:
            print(f"EXISTS {name}")
            continue
        print(f"FAIL {name} http={e.code} {raw[:600]}")
        continue
print("DONE")
PY
