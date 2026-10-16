# Semaine de l'industrie 2026

Monorepo : site public + API. Hébergement VPS (Postgres, n8n) — pas de Docker ni Supabase pour front/API.

## Structure

```
frontend/     React + Vite + TypeScript
backend/      Express + Sequelize + PostgreSQL
deploy/       Nginx, systemd, scripts de mise en prod
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

Healthcheck API : `GET http://localhost:3000/api/v1/health`

Compte orga démo (après seed) : `orga@semaine-industrie.tg` / `Orga2026!`

## Déploiement VPS

Fichiers dans `deploy/` :

1. Copier `deploy/systemd/semaine-industrie-api.service` → `/etc/systemd/system/`
2. Copier `deploy/nginx/semaine-industrie.conf` → sites-available, activer, Certbot
3. Créer `/var/www/semaine-industrie/backend/.env` depuis `deploy/env.production.example`
4. Sur le serveur (repo cloné) : `bash deploy/deploy.sh`
5. Backup Postgres : cron sur `deploy/postgres-backup.sh`

Sous-domaine `admin.` sert le **même** build React ; l’espace orga est sous `/orga` + `/login`.
