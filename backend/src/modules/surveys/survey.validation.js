'use strict';

const Joi = require('joi');

const submitSchema = Joi.object({
  passport_code: Joi.string().trim().max(24).allow('', null),
  phase: Joi.string().valid('before', 'after').required(),
  answers: Joi.object().required(),
  source: Joi.string().valid('qr', 'paper').default('qr'),
});

module.exports = { submitSchema };
