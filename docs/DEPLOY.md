# Déploiement VPS (CI → SSH)

Automatisation : chaque push sur `main` (et les runs manuels `workflow_dispatch`) déclenche `.github/workflows/deploy.yml`, qui ouvre une session SSH et exécute uniquement `scripts/deploy.sh` sur le VPS.

## Stack détectée

| Couche | Techno | Production |
|--------|--------|------------|
| Frontend | React + Vite + TypeScript | Build → `frontend/dist`, servi par **Nginx** |
| Backend | Express + Sequelize | **PM2** `industrie-api` sur **127.0.0.1:3005** |
| BDD | PostgreSQL | Hors Docker ; **non touchée** par le script CI |
| Conteneurs | Aucun pour front/API | Pas besoin du groupe `docker` |

Répertoire d’application (hypothèse / défaut) : **`/var/www/semaine-industrie`** (`DEPLOY_DIR` dans `scripts/deploy.sh`).

Le script CI **ne modifie jamais** les fichiers `.env` ni la base (pas de migrate/seed). Pour un premier setup ou des migrations, utiliser encore `deploy/setup.sh` / `deploy/deploy.sh` à la main.

---

## 1. Utilisateur dédié (sans sudo)

Sur le VPS, en root (une seule fois) :

```bash
# Compte dédié au déploiement — pas de sudo
sudo adduser --disabled-password --gecos "Deploy" deploy

# Ce projet n'utilise pas Docker pour front/API.
# Si un autre service Docker devait être géré plus tard :
#   sudo usermod -aG docker deploy

# Propriétaire du clone applicatif
sudo mkdir -p /var/www/semaine-industrie
sudo chown -R deploy:deploy /var/www/semaine-industrie
```

Le process PM2 `industrie-api` doit tourner **sous `deploy`** (même user que le script), sinon `pm2 restart` échouera.

---

## 2. Clé ed25519 dédiée (CI uniquement)

Sur une machine de confiance (pas besoin de la garder sur le VPS) :

```bash
ssh-keygen -t ed25519 -f ./github-deploy-vps -C "github-actions-deploy" -N ""
```

- **Privée** (`github-deploy-vps`) → secret GitHub `VPS_SSH_KEY` uniquement.
- **Publique** (`github-deploy-vps.pub`) → `authorized_keys` du user `deploy`.

Ne jamais committer la clé privée.

---

## 3. `authorized_keys` en forced command

Installer le repo (si besoin) puis restreindre la clé :

```bash
sudo -u deploy bash -lc '
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  # Clone initial si absent (URL HTTPS ou deploy key lecture seule séparée)
  # git clone git@github.com:OWNER/semaine-industrie.git /var/www/semaine-industrie
'

# Forced command = script du repo ; pas de shell interactif / forwardings
PUB="$(cat github-deploy-vps.pub)"
sudo -u deploy bash -lc "cat >> ~/.ssh/authorized_keys" <<EOF
command="/var/www/semaine-industrie/scripts/deploy.sh",no-port-forwarding,no-agent-forwarding,no-pty,no-X11-forwarding $PUB
EOF
sudo -u deploy chmod 600 ~/.ssh/authorized_keys
```

Rendre le script exécutable :

```bash
sudo -u deploy chmod +x /var/www/semaine-industrie/scripts/deploy.sh
```

Avec cette config, **toute** connexion SSH avec cette clé exécute uniquement `scripts/deploy.sh` (le `script:` du workflow GitHub Actions est ignoré côté shell libre, mais le code de sortie du forced command fait échouer le job si le deploy échoue).

Tester depuis une autre machine :

```bash
ssh -i github-deploy-vps -p 22 deploy@VPS_HOST
# → doit lancer le deploy et se terminer ; pas de prompt shell
```

---

## 4. Host key pinning (`VPS_KNOWN_HOSTS`)

```bash
ssh-keyscan -p 22 -H VPS_HOST
```

Copier la ligne (ou les lignes) produite(s) dans le secret `VPS_KNOWN_HOSTS`. Ne pas désactiver la vérification du host key.

---

## 5. Secrets GitHub

Dans le dépôt : **Settings → Secrets and variables → Actions** :

| Secret | Contenu |
|--------|---------|
| `VPS_HOST` | IP ou hostname du VPS |
| `VPS_PORT` | Port SSH (souvent `22`) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Contenu **complet** de la clé privée ed25519 (y compris les lignes `BEGIN` / `END`) |
| `VPS_KNOWN_HOSTS` | Sortie de `ssh-keyscan -H …` |

Aucun secret ne doit être commité dans le dépôt.

---

## 6. Prérequis déjà en place sur le VPS

Avant le premier run CI :

1. Repo cloné dans `/var/www/semaine-industrie`, branche `main` trackée.
2. `backend/.env` renseigné (DB, JWT, etc.) — le script CI ne le crée pas.
3. Postgres + Nginx + Node/npm + PM2 installés ; API déjà démarrée une fois (`deploy/setup.sh` puis un `deploy/deploy.sh` manuel si besoin).
4. `scripts/deploy.sh` présent et exécutable (après merge de cette doc / premier `git pull`).

---

## 7. Ce que fait `scripts/deploy.sh`

1. `cd` dans `DEPLOY_DIR` (défaut `/var/www/semaine-industrie`)
2. `git fetch` + `git reset --hard origin/main` (sans `git clean`)
3. Frontend : `npm ci` + suppression de `frontend/dist` uniquement + `npm run build`
4. Backend : `npm ci --omit=dev` + `pm2 restart industrie-api`
5. Health check : `curl` sur `http://127.0.0.1:3005/api/v1/health`
6. Journal : `logs/deploy.log`

En cas d’échec (git, build, PM2, health), le script sort en non-zéro → le job GitHub Actions échoue.

---

## 8. Concurrence

Le workflow utilise `concurrency.group: deploy-vps` avec `cancel-in-progress: false` : un seul déploiement à la fois ; les pushes suivants attendent la fin du run en cours.
