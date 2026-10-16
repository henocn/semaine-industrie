'use strict';

const ApiError = require('../utils/ApiError');

/* Valide body / query / params avec un schéma Joi. */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(ApiError.badRequest('Données invalides', details));
    }

    req[source] = value;
    return next();
  };
}

module.exports = validate;
