'use strict';

const Joi = require('joi');

const staffRoles = Joi.string().valid('admin', 'simple');

const createUserSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().max(180).required(),
  first_name: Joi.string().trim().min(1).max(100).required(),
  last_name: Joi.string().trim().min(1).max(100).required(),
  role: staffRoles.default('simple'),
  password: Joi.string().min(6).max(120).required(),
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).optional(),
  last_name: Joi.string().trim().min(1).max(100).optional(),
  role: staffRoles.optional(),
  is_active: Joi.boolean().optional(),
  /* Vide = ne pas changer le mot de passe. */
  password: Joi.string().min(6).max(120).allow('').optional(),
}).min(1);

module.exports = { createUserSchema, updateUserSchema };
