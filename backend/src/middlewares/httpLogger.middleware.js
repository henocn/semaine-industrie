'use strict';

const logger = require('../utils/logger');

/* Journalise chaque requête HTTP (méthode, URL, statut, durée) — pas de SQL. */
function httpLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.info(line);
  });
  next();
}

module.exports = httpLogger;
