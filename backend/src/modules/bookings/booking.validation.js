'use strict';

const Joi = require('joi');

/* Arrangement orga : site + établissement + créneau. */
const createBookingSchema = Joi.object({
  organization_id: Joi.string().uuid().required(),
  school_organization_id: Joi.string().uuid().required(),
  visit_day: Joi.string().trim().max(40).required(),
  visit_start: Joi.string().trim().max(10).required(),
  visit_end: Joi.string().trim().max(10).required(),
  headcount: Joi.number().integer().min(1).max(500).allow(null),
  notes: Joi.string().trim().allow('', null),
});

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
