'use strict';

const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

module.exports = { loginSchema, refreshSchema };
