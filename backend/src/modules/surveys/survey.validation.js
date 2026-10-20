'use strict';

const Joi = require('joi');

const optionsSchema = Joi.array().items(Joi.string().trim().min(1).max(200)).min(2).max(12);

const submitSchema = Joi.object({
  passport_code: Joi.string().trim().max(24).allow('', null),
  phase: Joi.string().valid('before', 'after').required(),
  answers: Joi.object().required(),
  source: Joi.string().valid('qr', 'paper').default('qr'),
});

const createQuestionSchema = Joi.object({
  label: Joi.string().trim().min(3).max(400).required(),
  kind: Joi.string().valid('scale', 'choice').default('scale'),
  options: optionsSchema.when('kind', {
    is: 'choice',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  sort_order: Joi.number().integer().min(0).optional(),
});

const updateQuestionSchema = Joi.object({
  label: Joi.string().trim().min(3).max(400).optional(),
  kind: Joi.string().valid('scale', 'choice').optional(),
  options: optionsSchema.optional().allow(null),
  sort_order: Joi.number().integer().min(0).optional(),
}).min(1);

const reorderSchema = Joi.object({
  ordered_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

module.exports = {
  submitSchema,
  createQuestionSchema,
  updateQuestionSchema,
  reorderSchema,
};
