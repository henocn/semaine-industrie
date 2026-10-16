'use strict';

const Joi = require('joi');

const batchSchema = Joi.object({
  count: Joi.number().integer().min(1).max(200).default(10),
  school_name: Joi.string().trim().max(200).allow('', null),
  class_label: Joi.string().trim().max(80).allow('', null),
});

const scanSchema = Joi.object({
  code: Joi.string().trim().min(4).max(24).required(),
  organization_id: Joi.string().uuid().required(),
  scanned_by: Joi.string().trim().max(160).allow('', null),
});

module.exports = { batchSchema, scanSchema };
