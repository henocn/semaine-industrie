# Semaine de l'industrie 2026

Monorepo : site public + API. Hébergement VPS (Postgres, n8n, PM2) — pas de Docker ni Supabase pour front/API.

Site : [semaineindustrie.tg](https://semaineindustrie.tg/)

## Structure

```
frontend/     React + Vite + TypeScript
backend/      Express + Sequelize + PostgreSQL
deploy/       setup, deploy, Nginx, PM2
ressources/   notes locales (gitignored)
.cursor/      skills & rules locales (gitignored)
```

## Démarrage local

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Healthcheck API : `GET http://localhost:3005/api/v1/health`

Compte orga démo (après seed local) : `orga@semaine-industrie.tg` / `Orga2026!`

## Déploiement VPS

- Domaine : `https://semaineindustrie.tg`
- Front Nginx : `/var/www/semaine-industrie/frontend/dist`
- API PM2 : **`industrie-api`** sur le port **3005**

```bash
# 1) Clone
sudo mkdir -p /var/www/semaine-industrie
sudo chown "$USER:$USER" /var/www/semaine-industrie
git clone <url-du-repo> /var/www/semaine-industrie
cd /var/www/semaine-industrie

# 2) Setup (une fois) — uploads, .env exemple, PM2, Nginx écrasé
sudo bash deploy/setup.sh

# 3) Créer la BDD + user Postgres, puis éditer backend/.env
#    (DB_*, JWT_ACCESS_SECRET, SUPERADMIN_PASSWORD, …)

# 4) Premier déploiement + chaque mise à jour ensuite
bash deploy/deploy.sh
```

`deploy.sh` force l’alignement git (`reset --hard origin/<branche>`), rebuild, migrations, seed du seul superadmin, restart PM2.

Backup Postgres : cron sur `deploy/postgres-backup.sh`.

Espace orga : `/orga` + `/login`.
