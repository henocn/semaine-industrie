# Déploiement VPS (self-hosted runner)

Inbound SSH vers le VPS est fermé. Le déploiement passe par un **GitHub Actions runner self-hosted** sur le VPS (connexion **sortante** vers GitHub uniquement).

Workflow : `.github/workflows/deploy.yml` — `push` sur `main` + `workflow_dispatch` uniquement (**jamais** `pull_request`). Job : `runs-on: [self-hosted, linux, semaine-industrie]` → `bash /var/www/semaine-industrie/deploy/deploy.sh`.

## Stack

| Couche | Techno | Production |
|--------|--------|------------|
| Frontend | React + Vite | `frontend/dist` (Nginx) |
| Backend | Express + Sequelize | PM2 `industrie-api` @:3005 (sous **webuser**) |
| App dir | `/var/www/semaine-industrie` | propriétaire **webuser** |

`deploy/deploy.sh` : `flock`, log `/home/webuser/deploy.log`, `PREV` puis `reset --hard origin/main`, build, migrations, PM2, health 15×2s, rollback git si échec, puis `sudo -n` nginx test/reload. **Les migrations DB ne sont pas annulées** au rollback.

---

## 1. User `webuser` (existant)

Pas de nouvel utilisateur. **`webuser`** possède déjà `/var/www/semaine-industrie`, fait tourner PM2 (`industrie-api`), n’est **pas** dans le groupe `docker`, et a un sudo passwordless **uniquement** pour :

```
/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
/usr/bin/certbot
```

Vérifications utiles (root) :

```bash
# propriétaire app + PM2 sous webuser
ls -ld /var/www/semaine-industrie
sudo -u webuser pm2 describe industrie-api

touch /home/webuser/deploy.log && chown webuser:webuser /home/webuser/deploy.log
```

`webuser` doit pouvoir `git fetch` sur le clone (deploy key read-only ou remote déjà OK).

---

## 2. Token d’enregistrement

Sur GitHub : **Settings → Actions → Runners → New self-hosted runner**.

Choisir Linux / x64. La page affiche l’URL du tar.gz, le **SHA256**, et un **registration token** (courte durée). Copier ces valeurs (ne pas les committer).

---

## 3. Installer le runner (root)

Remplacer `VERSION`, `SHA256` et `REG_TOKEN` par ceux de la page Runners.

```bash
install -d -o webuser -g webuser -m 755 /home/webuser/actions-runner
cd /home/webuser/actions-runner

curl -o actions-runner-linux-x64-VERSION.tar.gz -L \
  https://github.com/actions/runner/releases/download/vVERSION/actions-runner-linux-x64-VERSION.tar.gz

echo "SHA256  actions-runner-linux-x64-VERSION.tar.gz" | shasum -a 256 -c

tar xzf actions-runner-linux-x64-VERSION.tar.gz
chown -R webuser:webuser /home/webuser/actions-runner

sudo -u webuser ./config.sh \
  --url https://github.com/henocn/semaine-industrie \
  --token REG_TOKEN \
  --name vps-semaine-industrie \
  --labels semaine-industrie \
  --work _work \
  --unattended

# Service systemd sous webuser
./svc.sh install webuser
./svc.sh start
./svc.sh status
```

Le runner doit apparaître **Idle** dans Settings → Actions → Runners.

---

## 4. Sécurité

- Dépôt **privé** uniquement (le runner exécute le workflow avec les droits de `webuser`).
- Ne **jamais** déclencher ce workflow sur `pull_request` / forks (`push` + `workflow_dispatch` seulement).
- Restreindre qui peut merger sur `main` et lancer `workflow_dispatch`.
- Pas de secrets VPS_* / SSH.
- Pas de `actions/checkout` : le job appelle seulement `deploy/deploy.sh` sur l’arbre de prod.
- Sudo de `webuser` limité aux trois binaires nginx/certbot ci-dessus (`sudo -n` dans le script).

---

## 5. Retirer le runner

```bash
cd /home/webuser/actions-runner
./svc.sh stop
./svc.sh uninstall
# Token de remove : Settings → Actions → Runners → (runner) → Remove
sudo -u webuser ./config.sh remove --token REMOVE_TOKEN
```

---

## 6. Test

Actions → **Deploy** → Run workflow. Log local : `/home/webuser/deploy.log`.
