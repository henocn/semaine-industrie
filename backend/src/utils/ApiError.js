'use strict';

/* Erreur métier avec code HTTP et code applicatif. */
class ApiError extends Error {
  /* Crée une erreur opérationnelle. */
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  /* 400 Bad Request. */
  static badRequest(message = 'Mauvaise requête', details = []) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  /* 401 Unauthorized. */
  static unauthorized(message = 'Non autorisé') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  /* 403 Forbidden. */
  static forbidden(message = 'Accès interdit') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  /* 404 Not Found. */
  static notFound(message = 'Ressource non trouvée') {
    return new ApiError(404, 'RESOURCE_NOT_FOUND', message);
  }

  /* 409 Conflict. */
  static conflict(message = 'Conflit') {
    return new ApiError(409, 'CONFLICT', message);
  }

  /* 500 Internal. */
  static internal(message = 'Erreur interne') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

module.exports = ApiError;
