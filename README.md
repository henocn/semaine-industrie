# Semaine de l'industrie 2026

Monorepo : site public + API.

## Structure

```
frontend/     React + Vite + TypeScript
backend/      Express + Sequelize + PostgreSQL
ressources/   notes locales (gitignored)
.cursor/      skills & rules locales (gitignored)
```

## Démarrage

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
cp .env.example .env
npm install
npm run dev
```

Healthcheck API : `GET http://localhost:3000/api/v1/health`
