'use strict';

const Joi = require('joi');

/* Arrangement orga : site + un ou plusieurs établissements + créneau. */
const createBookingSchema = Joi.object({
  organization_id: Joi.string().uuid().required(),
  school_organization_id: Joi.string().uuid(),
  school_organization_ids: Joi.array().items(Joi.string().uuid()).min(1),
  visit_day: Joi.string().trim().max(40).required(),
  visit_start: Joi.string().trim().max(10).required(),
  visit_end: Joi.string().trim().max(10).required(),
  headcount: Joi.number().integer().min(1).max(500).allow(null),
  notes: Joi.string().trim().allow('', null),
}).or('school_organization_id', 'school_organization_ids');

/* Mise à jour d'une visite arrangée. */
const updateBookingSchema = Joi.object({
  organization_id: Joi.string().uuid().required(),
  school_organization_id: Joi.string().uuid().required(),
  visit_day: Joi.string().trim().max(40).required(),
  visit_start: Joi.string().trim().max(10).required(),
  visit_end: Joi.string().trim().max(10).required(),
  headcount: Joi.number().integer().min(1).max(500).allow(null),
  notes: Joi.string().trim().allow('', null),
});

module.exports = { createBookingSchema, updateBookingSchema };
