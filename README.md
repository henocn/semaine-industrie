# Semaine de l'industrie 2026

Monorepo : site public, backoffice orga, API et bot WhatsApp.

Site : [semaineindustrie.tg](https://semaineindustrie.tg/)

## Structure

```
frontend/     React 19 + Vite + TypeScript + Tailwind v4 (lint : oxlint)
backend/      Express + Sequelize + PostgreSQL (validation Joi)
deploy/       scripts de déploiement, Nginx, PM2, modèles WhatsApp
docs/         documentation de déploiement
```

## Fonctionnalités

### Site public

| Route | Rôle |
|---|---|
| `/programme` | Programme du 16 au 22 novembre |
| `/label` | Demande de label (industries) |
| `/inscription-groupe` | Inscription écoles, centres de formation, universités (`/inscription` y redirige) |
| `/inscription-particulier` | Participer en tant que particulier |
| `/affaires` | Rencontres d'affaires (entreprise ou particulier) |
| `/industrie`, `/carte`, `/o/:slug` | Industries labellisées, carte des visites, fiche publique |
| `/vue-par-vous` | Défis : sondage avant / après visite (`?jeu=sondage`), quiz (`?jeu=quiz`), explorateur de talents (`?jeu=talents`). `/questionnaire` y redirige |
| `/vote` | Vote coup de cœur |
| `/ressources`, `/faq` | Documents, questions fréquentes |

Téléphone obligatoire sur les formulaires publics : saisie internationale avec drapeau (`react-phone-number-input`), revalidée et stockée en E.164 côté API (`libphonenumber-js`, Togo par défaut).

### Backoffice (`/orga`)

Demandes de labels, Participations (onglets Écoles / Particuliers), Planning visites, Rencontres d'affaires, Sondage (onglets Sondage, Jeux, Coup de cœur), Ressources, Audit et Utilisateurs (admin).

- Tables : détail sous la ligne cliquée, actions en icônes, statut porté par la couleur de ligne.
- Export Excel : première colonne à cocher, puis Exporter en Excel (`write-excel-file`, chargé à la demande).
- Mise à jour en temps réel (Socket.IO).

### Codes de suivi

`IN-XXXX` industrie, `EC-XXXX` école / université, `PA-XXXX` particulier, `AF-XXXX` rencontres d'affaires. Donnés à l'acceptation.

### WhatsApp

Bot (menu, programme, suivi par code ou e-mail) et notifications par modèles Meta : label reçu / accepté / refusé, inscription en attente / acceptée / refusée, visite fixée (école) et accueil (industrie), rendez-vous fixé ou reporté. Sans modèle approuvé, repli sur un message de session.

Les modèles sont décrits dans `deploy/whatsapp-templates.json` et créés avec `deploy/create-wa-templates.sh`. Un modèle approuvé qu'on modifie repasse en validation : changer de nom si les variables changent.

## Démarrage local

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
cp .env.example .env   # puis renseigner les valeurs
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Healthcheck API : `GET /api/v1/health`

Les variables attendues sont listées dans `backend/.env.example` (base de données, JWT, URL publique, WhatsApp, SMTP). Ne jamais versionner `.env`.

Avant une contribution : `npm run lint` et `npm run build` dans `frontend/`.

## Déploiement

Voir [docs/DEPLOY.md](docs/DEPLOY.md) et les scripts du dossier `deploy/`.
