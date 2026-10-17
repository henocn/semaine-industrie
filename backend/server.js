'use strict';

/* Point d'entrée : connecte Postgres puis démarre HTTP + Socket.IO. */
const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { sequelize } = require('./src/models');
const { initRealtime } = require('./src/realtime/io');

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info(`Database connected: ${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT}`);

    const server = http.createServer(app);
    initRealtime(server);

    server.listen(env.PORT, () => {
      logger.info(`API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error.message);
    process.exit(1);
  }
}

startServer();
