'use strict';

const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(80).required(),
  last_name: Joi.string().trim().min(1).max(80).required(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().min(6).required(),
  new_password: Joi.string().min(6).required(),
});

module.exports = {
  loginSchema,
  refreshSchema,
  updateProfileSchema,
  changePasswordSchema,
};
