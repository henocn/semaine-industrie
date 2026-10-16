'use strict';

/* Point d'entrée : connecte Postgres puis démarre l'API. */
const app = require('./src/app');
const env = require('./src/config/env');
const { sequelize } = require('./src/models');

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log(`Database connected: ${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT}`);

    app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  }
}

startServer();
