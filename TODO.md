# TODO — Semaine de l'industrie 2026

> Site public + API sur VPS (Postgres, n8n). Pas de Supabase, pas de Docker pour front/API.
> Ordre : **Backend socle → Label (P0) → Fiches/QR → Carte → Auth/admin → Dashboard → P1/P2**
> Réf. : `ressources/NOTES-innovations.md`

---

## PHASE 0 — Organisation (fait)

- [x] **0.1** Monorepo `frontend/` + `backend/`
- [x] **0.2** `.cursor/` (rule + skills) et `ressources/` (gitignored)
- [x] **0.3** Site public React (hero, programme, lieux, contact)

---

## PHASE 1 — Backend socle (`/backend`)

### 1.1 — Setup

- [x] **1.1.1** Squelette Express + Sequelize + health
- [x] **1.1.2** Installer deps : joi, bcrypt, jsonwebtoken, uuid + scripts migrate
- [x] **1.1.3** Utilitaires : `ApiResponse`, `ApiError`, logger simple
- [x] **1.1.4** Middleware `validate` (Joi)
- [x] **1.1.5** `npm run dev` OK + connexion Postgres `semaine_industrie`
- [x] **1.1.6** Scripts npm : `db:migrate`, `db:migrate:undo`, `db:seed`

### 1.2 — Auth (comptes nécessaires)

- [x] **1.2.1** Modèles `User` + `RefreshToken` + migrations
- [x] **1.2.2** Module `auth` : login, refresh, logout, `/me`
- [x] **1.2.3** Middleware JWT + rôles (`orga`, `enseignant`, `referent_entreprise`, `b2b`)
- [x] **1.2.4** Seed compte orga de démo

---

## PHASE 2 — P0 Label + fiches + carte + bilan

### 2.1 — Label en ligne

- [x] **2.1.1** Modèle `Organization` (entreprise / école) + migration
- [x] **2.1.2** Modèle `LabelRequest` (demande, créneaux, capacité, référent, produits, statut)
- [x] **2.1.3** Module `labels` : POST demande (public), GET liste + PATCH validation (orga)
- [x] **2.1.4** Génération slug / code label unique au moment de la validation
- [x] **2.1.5** Hook prêt pour n8n (webhook kit mail/WhatsApp) — stub

### 2.2 — QR + fiches publiques

- [x] **2.2.1** Endpoint public `GET /organizations/:slug` (fiche)
- [ ] **2.2.2** Endpoint / script génération QR en lot (URL fiches)
- [x] **2.2.3** Page frontend fiche entreprise `/o/:slug`

### 2.3 — Carte des usines

- [x] **2.3.1** Champs lat/lng + secteur + région sur Organization
- [x] **2.3.2** `GET /organizations/map` (labels validés, filtres)
- [x] **2.3.3** Page frontend carte (`/carte`)

### 2.4 — Dashboard / bilan

- [ ] **2.4.1** Endpoint agrégats (labels, résas, RDV, scans quand dispo)
- [ ] **2.4.2** Écran orga dashboard
- [ ] **2.4.3** Page bilan publique (dimanche)

### 2.5 — Frontend espaces connectés

- [x] **2.5.1** React Router + pages publiques
- [x] **2.5.2** Formulaire demande de label (`/label`)
- [x] **2.5.3** Écran validation orga (`/orga/labels` + `/login`)
- [x] **2.5.4** Client API (`frontend/src/api`)

---

## PHASE 3 — P1

- [ ] **3.1** Réservations visites (enseignants)
- [ ] **3.2** Rencontres d’affaires (profils + matching simple + fiches contact)
- [ ] **3.3** Branchements n8n / WhatsApp (ou plan B réponses rapides)

---

## PHASE 4 — P2

- [ ] **4.1** Passeport industrie (numéros, scan référent, page mon parcours)
- [ ] **4.2** Questions live + vote samedi
- [ ] **4.3** Questionnaire avant / après

---

## PHASE 5 — Déploiement VPS

- [ ] **5.1** Nginx : site + reverse proxy API (+ sous-domaine admin si besoin)
- [ ] **5.2** systemd service API
- [ ] **5.3** Migrations prod + backup Postgres
- [ ] **5.4** Healthcheck + variables `.env` serveur

---

## En cours

→ **2.4** dashboard/bilan · **2.2.2** QR en lot · P1 réservations
