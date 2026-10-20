'use strict';

const Joi = require('joi');

const contactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),
  organization: Joi.string().trim().max(200).allow('', null),
  email: Joi.string().trim().email().max(180).required(),
  message: Joi.string().trim().min(5).max(4000).required(),
});

module.exports = { contactSchema };
