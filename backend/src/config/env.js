'use strict';

/* Charge et valide les variables d'environnement. */
const { cleanEnv, str, port, num } = require('envalid');
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
  JWT_ACCESS_EXPIRES_IN: str({ default: '7d' }),

  ALLOWED_ORIGINS: str({ default: 'http://localhost:5173' }),
  PUBLIC_APP_URL: str({ default: 'http://localhost:5173' }),
  N8N_WEBHOOK_URL: str({ default: '' }),

  /* Assistant du site : la clé reste sur le serveur. */
  DIFY_API_URL: str({ default: 'https://dify.dekaeditions.tg/v1' }),
  DIFY_API_KEY: str({ default: '' }),

  /* WhatsApp Cloud API (bot Semaine de l'industrie) */
  WHATSAPP_TOKEN: str({ default: '' }),
  WHATSAPP_PHONE_NUMBER_ID: str({ default: '' }),
  WHATSAPP_VERIFY_TOKEN: str({ default: 'si2026-wa-verify' }),
  WHATSAPP_WABA_ID: str({ default: '2387848361959787' }),
  WHATSAPP_TEMPLATE_LANG: str({ default: 'fr' }),

  /* PDF programme officiel (chemin public ou URL absolue). */
  PROGRAMME_PDF_URL: str({ default: '/uploads/docs/programme-si2026.pdf' }),
  /* Places pour les particuliers ; au-delà, l'inscription reste ouverte en liste d'attente. */
  PARTICULIER_LIMIT: num({ default: 80 }),

  /* SMTP SiteGround — mot de passe à renseigner en prod (laisser vide ici si besoin). */
  SMTP_HOST: str({ default: 'mail.semaineindustrie.tg' }),
  SMTP_PORT: str({ default: '465' }),
  SMTP_SECURE: str({ default: 'true' }),
  SMTP_USER: str({ default: 'no-reply@semaineindustrie.tg' }),
  SMTP_PASS: str({ default: '' }),
  MAIL_FROM_NOTIFY: str({ default: 'Semaine industrie <no-reply@semaineindustrie.tg>' }),
  MAIL_FROM_CONTACT: str({ default: 'Semaine industrie <infos@semaineindustrie.tg>' }),
  MAIL_TO_CONTACT: str({ default: 'infos@semaineindustrie.tg' }),
});

module.exports = env;
