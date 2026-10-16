'use strict';

const Joi = require('joi');

const createBookingSchema = Joi.object({
  organization_id: Joi.string().uuid().required(),
  school_name: Joi.string().trim().min(2).max(200).required(),
  teacher_name: Joi.string().trim().min(2).max(160).required(),
  teacher_email: Joi.string().trim().email().max(180).required(),
  teacher_phone: Joi.string().trim().max(40).allow('', null),
  visit_day: Joi.string().trim().max(40).required(),
  visit_start: Joi.string().trim().max(10).required(),
  visit_end: Joi.string().trim().max(10).required(),
  headcount: Joi.number().integer().min(1).max(500).required(),
  notes: Joi.string().trim().allow('', null),
});

module.exports = { createBookingSchema };
