'use strict';

const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().max(180).required(),
  first_name: Joi.string().trim().min(1).max(100).required(),
  last_name: Joi.string().trim().min(1).max(100).required(),
  role: Joi.string().valid('orga', 'enseignant', 'referent_entreprise', 'b2b').default('orga'),
  password: Joi.string().min(6).max(120).required(),
});

const updateUserSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).optional(),
  last_name: Joi.string().trim().min(1).max(100).optional(),
  role: Joi.string().valid('orga', 'enseignant', 'referent_entreprise', 'b2b').optional(),
  is_active: Joi.boolean().optional(),
  password: Joi.string().min(6).max(120).optional(),
}).min(1);

module.exports = { createUserSchema, updateUserSchema };
