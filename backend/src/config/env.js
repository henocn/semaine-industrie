'use strict';

/* Charge et valide les variables d'environnement. */
const { cleanEnv, str, port } = require('envalid');
const dotenv = require('dotenv');

/* override: true pour que .env gagne sur un ancien WHATSAPP_TOKEN injecté par PM2 */
dotenv.config({ override: true });

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3005 }),
  API_PREFIX: str({ default: '/api/v1' }),

  DB_HOST: str({ default: 'localhost' }),
  DB_PORT: port({ default: 5432 }),
  DB_NAME: str({ default: 'semaine_industrie' }),
  DB_USER: str({ default: 'postgres' }),
  DB_PASSWORD: str({ default: 'postgres' }),

  JWT_ACCESS_SECRET: str({ default: 'dev-access-secret-change-me' }),
  JWT_ACCESS_EXPIRES_IN: str({ default: '1d' }),

  ALLOWED_ORIGINS: str({ default: 'http://localhost:5173' }),
  PUBLIC_APP_URL: str({ default: 'http://localhost:5173' }),
  N8N_WEBHOOK_URL: str({ default: '' }),

  /* WhatsApp Cloud API (bot Semaine de l'industrie) */
  WHATSAPP_TOKEN: str({ default: '' }),
  WHATSAPP_PHONE_NUMBER_ID: str({ default: '' }),
  WHATSAPP_VERIFY_TOKEN: str({ default: 'si2026-wa-verify' }),

  /* PDF programme officiel (chemin public ou URL absolue). */
  PROGRAMME_PDF_URL: str({ default: '/uploads/docs/programme-si2026.pdf' }),
});

module.exports = env;
