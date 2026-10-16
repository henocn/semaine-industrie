'use strict';

const logger = require('../utils/logger');

/* Middleware Express de gestion centralisée des erreurs. */
function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';
  const details = err.details || [];

  if (status >= 500) {
    logger.error(err);
  }

  res.status(status).json({
    success: false,
    error: { code, message, details },
  });
}

module.exports = errorHandler;
