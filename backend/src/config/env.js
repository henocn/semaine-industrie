'use strict';

/* Charge et valide les variables d'environnement. */
const { cleanEnv, str, port } = require('envalid');
const dotenv = require('dotenv');

dotenv.config();

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3000 }),
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
});

module.exports = env;
