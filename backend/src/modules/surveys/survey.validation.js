'use strict';

const Joi = require('joi');

const submitSchema = Joi.object({
  passport_code: Joi.string().trim().max(24).allow('', null),
  phase: Joi.string().valid('before', 'after').required(),
  answers: Joi.object().required(),
  source: Joi.string().valid('qr', 'paper').default('qr'),
});

const createQuestionSchema = Joi.object({
  label: Joi.string().trim().min(3).max(400).required(),
  sort_order: Joi.number().integer().min(0).optional(),
});

const updateQuestionSchema = Joi.object({
  label: Joi.string().trim().min(3).max(400).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const moveQuestionSchema = Joi.object({
  direction: Joi.string().valid('up', 'down').required(),
});

module.exports = {
  submitSchema,
  createQuestionSchema,
  updateQuestionSchema,
  moveQuestionSchema,
};
