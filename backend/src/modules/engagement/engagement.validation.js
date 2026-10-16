'use strict';

const Joi = require('joi');

const askSchema = Joi.object({
  session_key: Joi.string().trim().max(80).default('forum'),
  author_name: Joi.string().trim().max(120).allow('', null),
  body: Joi.string().trim().min(5).max(1000).required(),
});

const reviewQuestionSchema = Joi.object({
  status: Joi.string().valid('approved', 'done', 'rejected').required(),
});

const voteSchema = Joi.object({
  option_id: Joi.string().uuid().required(),
  voter_key: Joi.string().trim().min(8).max(80).required(),
});

const optionSchema = Joi.object({
  label: Joi.string().trim().min(2).max(200).required(),
  organization_id: Joi.string().uuid().allow(null),
});

module.exports = { askSchema, reviewQuestionSchema, voteSchema, optionSchema };
