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

/* Partie terminée : 5 réponses (index 0 à 3) ; score pour le quiz, profil(s) pour les talents. */
const gameResultSchema = Joi.object({
  game: Joi.string().valid('quiz', 'talents').required(),
  answers: Joi.array().items(Joi.number().integer().min(0).max(3)).length(5).required(),
  score: Joi.when('game', {
    is: 'quiz',
    then: Joi.number().integer().min(0).max(5).required(),
    otherwise: Joi.forbidden(),
  }),
  profiles: Joi.when('game', {
    is: 'talents',
    then: Joi.array().items(Joi.string().valid('P1', 'P2', 'P3', 'P4')).min(1).max(4).unique().required(),
    otherwise: Joi.forbidden(),
  }),
});

module.exports = {
  submitSchema,
  gameResultSchema,
  createQuestionSchema,
  updateQuestionSchema,
  reorderSchema,
};
