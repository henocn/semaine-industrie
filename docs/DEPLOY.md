# Déploiement VPS (GitHub Actions → SSH)

Chaque push sur `main` (et les runs `workflow_dispatch`) déclenche `.github/workflows/deploy.yml`. Le job ouvre une session **`ssh -T` sans commande** : la clé CI a une **forced command** qui exécute le script de deploy. Le job échoue si ce script échoue.

## Stack

| Couche | Techno | Production |
|--------|--------|------------|
| Frontend | React + Vite | `frontend/dist`, servi par **Nginx** (pas de reload nécessaire) |
| Backend | Express + Sequelize | **PM2** `industrie-api` sur **127.0.0.1:3005** |
| BDD | PostgreSQL | Migrations via le script ; **pas de rollback auto** |
| Docker | Non (front/API) | Pas de groupe `docker` |

Répertoire d’application (défaut) : **`/var/www/semaine-industrie`** (`APP_ROOT` / `DEPLOY_DIR`).

Script canonique dans le repo : **`deploy/deploy.sh`**.

---

## Comportement de `deploy/deploy.sh`

1. Verrou **`flock`** (`/tmp/si-deploy.lock`) — un seul deploy à la fois  
2. Journal **`/home/deploy/deploy.log`**  
3. Enregistre le commit courant (`PREV`), puis `git fetch` + `reset --hard origin/main` + `git clean -fd` (préserve `.env` / uploads gitignorés)  
4. Frontend `npm ci` + build, backend `npm ci --omit=dev`, **migrations**, seed superadmin, `pm2 restart industrie-api`  
5. Healthcheck : `curl http://127.0.0.1:3005/api/v1/health`, **15 essais / 2 s**  
6. Si échec : `git reset --hard $PREV`, rebuild + PM2, re-check, exit 1  

### Rollback et base de données

En cas d’échec, **seul le code** revient au commit précédent. **Les migrations Sequelize déjà appliquées ne sont pas annulées.** Si le schéma a avancé et que l’ancien code est incompatible, intervention manuelle (migrate undo ciblé ou forward-fix) est nécessaire. Documenté aussi dans les messages du script.

Pas de `sudo nginx reload` (build statique dans `frontend/dist`).

---

## 1. Utilisateur `deploy` (sans sudo)

```bash
sudo adduser --disabled-password --gecos "" deploy
# Pas de sudo. Pas de groupe docker (inutile pour ce stack).

sudo chown -R deploy:deploy /var/www/semaine-industrie
```

PM2 `industrie-api` doit tourner **sous `deploy`**. Si l’API tournait sous root :

```bash
# en root : pm2 delete industrie-api
sudo -u deploy bash -lc 'cd /var/www/semaine-industrie && pm2 start deploy/ecosystem.config.cjs --only industrie-api && pm2 save'
# puis pm2 startup systemd -u deploy --hp /home/deploy (exécuter la ligne affichée en root)
```

---

## 2. Installer le script (forced command)

Source de vérité : `deploy/deploy.sh` dans le clone. Sur le VPS, exposer le même fichier pour la clé CI :

```bash
# Symlink : les updates git mettent à jour le forced command
sudo -u deploy ln -sfn /var/www/semaine-industrie/deploy/deploy.sh /home/deploy/deploy.sh
sudo -u deploy chmod 750 /var/www/semaine-industrie/deploy/deploy.sh

# Journal
sudo -u deploy touch /home/deploy/deploy.log
```

Ou copie ponctuelle (`install -o deploy -g deploy -m 750 …`) si vous préférez figer le script hors repo — dans ce cas, re-copier après chaque changement du script.

---

## 3. Clé ed25519 CI → VPS

```bash
ssh-keygen -t ed25519 -N "" -f ./gha_deploy -C "github-actions-deploy"
```

`authorized_keys` du user `deploy` :

```bash
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
echo "command=\"/home/deploy/deploy.sh\",no-port-forwarding,no-agent-forwarding,no-pty,no-X11-forwarding $(cat gha_deploy.pub)" \
  | sudo -u deploy tee /home/deploy/.ssh/authorized_keys >/dev/null
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys
```

Privée → secret `VPS_SSH_KEY` uniquement ; ne jamais la committer. Supprimer la copie locale après ajout du secret (`shred -u gha_deploy`).

### Accès Git en lecture (fetch sur le VPS)

Le user `deploy` doit pouvoir `git fetch` (deploy key read-only GitHub, ou autre). Exemple :

```bash
sudo -u deploy ssh-keygen -t ed25519 -N "" -f /home/deploy/.ssh/github_ro -C deploy@vps
# Ajouter github_ro.pub comme Deploy key (read-only) sur le dépôt GitHub
sudo -u deploy git -C /var/www/semaine-industrie remote set-url origin git@github.com:OWNER/semaine-industrie.git
```

---

## 4. Host key pinning

```bash
ssh-keyscan -t ed25519 -p 22 VPS_HOST
# Vérifier l’empreinte contre le VPS :
#   ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Mettre la sortie **vérifiée** dans `VPS_KNOWN_HOSTS`. Le workflow utilise `StrictHostKeyChecking=yes` + ce fichier (pas de `accept-new`).

---

## 5. Secrets GitHub

**Settings → Secrets and variables → Actions** :

| Secret | Contenu |
|--------|---------|
| `VPS_HOST` | IP ou hostname du VPS |
| `VPS_PORT` | Port SSH (ex. `22`) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Clé privée ed25519 complète (`BEGIN` … `END`) |
| `VPS_KNOWN_HOSTS` | Ligne(s) `ssh-keyscan` vérifiée(s) |

Aucun secret dans le dépôt.

---

## 6. Workflow

- Déclencheurs : `push` → `main`, `workflow_dispatch`  
- `concurrency` : groupe `deploy-vps`, `cancel-in-progress: false`  
- `ssh -T` avec clé + `UserKnownHostsFile` éphémère ; **aucune commande distante** (forced command)  

Test : Actions → Deploy → Run workflow. Logs VPS : `/home/deploy/deploy.log`.

---

## 7. Prérequis one-shot

1. Clone dans `/var/www/semaine-industrie`, `backend/.env` renseigné  
2. Postgres, Nginx, Node/npm, PM2 OK (`deploy/setup.sh` une fois si besoin)  
3. User `deploy`, script + `authorized_keys`, secrets GitHub  
