'use strict';

/* Formate les réponses JSON de succès. */
class ApiResponse {
  /* Envoie une réponse succès standard. */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  }

  /* Envoie une réponse 201 Created. */
  static created(res, data = null, message = 'Ressource créée') {
    return ApiResponse.success(res, data, message, 201);
  }

  /* Envoie une réponse paginée. */
  static paginated(res, { data, page, limit, total, message = 'Succès' }) {
    const totalPages = Math.ceil(total / limit) || 0;
    return res.status(200).json({
      success: true,
      data,
      message,
      meta: { page, limit, total, totalPages },
    });
  }
}

module.exports = ApiResponse;
