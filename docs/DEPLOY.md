# Déploiement VPS (self-hosted runner)

Inbound SSH vers le VPS est fermé. Le déploiement passe par un **GitHub Actions runner self-hosted** sur le VPS (connexion **sortante** vers GitHub uniquement).

Workflow : `.github/workflows/deploy.yml` — `push` sur `main` + `workflow_dispatch` uniquement (**jamais** `pull_request`). Job : `runs-on: [self-hosted, linux, semaine-industrie]` → `bash /var/www/semaine-industrie/deploy/deploy.sh`.

## Stack

| Couche | Techno | Production |
|--------|--------|------------|
| Frontend | React + Vite | `frontend/dist` (Nginx) |
| Backend | Express + Sequelize | PM2 `industrie-api` @:3005 |
| App dir | `/var/www/semaine-industrie` | `APP_ROOT` / `DEPLOY_DIR` |

`deploy/deploy.sh` : `flock`, log `/home/deploy/deploy.log`, `PREV` puis `reset --hard origin/main`, build, migrations, PM2, health 15×2s, rollback git si échec. **Les migrations DB ne sont pas annulées** au rollback.

---

## 1. User `deploy` (root, une fois)

```bash
adduser --disabled-password --gecos "" deploy   # pas de sudo
chown -R deploy:deploy /var/www/semaine-industrie

# PM2 industrie-api doit tourner sous deploy (pas root)
# Si besoin : pm2 delete industrie-api (root), puis :
sudo -u deploy bash -lc 'cd /var/www/semaine-industrie && pm2 start deploy/ecosystem.config.cjs --only industrie-api && pm2 save'
# pm2 startup systemd -u deploy --hp /home/deploy  → exécuter la ligne affichée en root

touch /home/deploy/deploy.log && chown deploy:deploy /home/deploy/deploy.log
```

Le user `deploy` doit pouvoir `git fetch` sur le clone (deploy key read-only ou remote déjà configuré).

---

## 2. Token d’enregistrement

Sur GitHub : **Settings → Actions → Runners → New self-hosted runner**.

Choisir Linux / x64. La page affiche l’URL du tar.gz, le **SHA256**, et un **registration token** (courte durée). Copier ces valeurs pour l’étape suivante (ne pas les committer).

---

## 3. Installer le runner (root)

Remplacer `VERSION`, `SHA256` et `REG_TOKEN` par ceux de la page Runners.

```bash
install -d -o deploy -g deploy -m 755 /home/deploy/actions-runner
cd /home/deploy/actions-runner

# Télécharger (VERSION = ex. 2.321.0 — prendre la valeur de l’UI)
curl -o actions-runner-linux-x64-VERSION.tar.gz -L \
  https://github.com/actions/runner/releases/download/vVERSION/actions-runner-linux-x64-VERSION.tar.gz

# Vérifier l’intégrité (SHA256 fourni sur la page New runner)
echo "SHA256  actions-runner-linux-x64-VERSION.tar.gz" | shasum -a 256 -c

tar xzf actions-runner-linux-x64-VERSION.tar.gz
chown -R deploy:deploy /home/deploy/actions-runner

sudo -u deploy ./config.sh \
  --url https://github.com/henocn/semaine-industrie \
  --token REG_TOKEN \
  --name vps-semaine-industrie \
  --labels semaine-industrie \
  --work _work \
  --unattended

# Service systemd sous le user deploy
./svc.sh install deploy
./svc.sh start
./svc.sh status
```

Le runner doit apparaître **Idle** dans Settings → Actions → Runners.

---

## 4. Sécurité

- Dépôt **privé** uniquement (un runner self-hosted exécute le code du workflow avec les droits de `deploy`).
- Ne **jamais** déclencher ce workflow sur `pull_request` / forks (déjà le cas : `push` + `workflow_dispatch` seulement).
- Restreindre qui peut merger sur `main` et lancer `workflow_dispatch`.
- Pas de secrets VPS_* / SSH : inutiles avec ce modèle.
- Le job ne fait **pas** `actions/checkout` : il appelle seulement `deploy/deploy.sh` sur l’arbre de prod.

---

## 5. Retirer le runner

```bash
cd /home/deploy/actions-runner
./svc.sh stop
./svc.sh uninstall
# Token de remove : Settings → Actions → Runners → (runner) → Remove
sudo -u deploy ./config.sh remove --token REMOVE_TOKEN
```

---

## 6. Test

Actions → **Deploy** → Run workflow. Log local : `/home/deploy/deploy.log`.
