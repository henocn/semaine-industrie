'use strict';

const Joi = require('joi');

const registerSchema = Joi.object({
  kind: Joi.string().valid('investisseur', 'pme', 'acheteur').required(),
  organization_name: Joi.string().trim().min(2).max(200).required(),
  contact_name: Joi.string().trim().min(2).max(160).required(),
  email: Joi.string().trim().email().max(180).required(),
  phone: Joi.string().trim().max(40).allow('', null),
  sector: Joi.string().trim().max(120).allow('', null),
  offers: Joi.string().trim().allow('', null),
  seeks: Joi.string().trim().allow('', null),
  country: Joi.string().trim().max(80).allow('', null),
  contact_opt_in: Joi.boolean().valid(true).required(),
});

const reviewParticipantSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
});

const createMeetingSchema = Joi.object({
  participant_ids: Joi.array().items(Joi.string().uuid()).min(1).max(12).required(),
  slot_start: Joi.date().iso().required(),
  slot_end: Joi.date().iso().greater(Joi.ref('slot_start')).required(),
  location: Joi.string().trim().max(200).allow('', null),
  table_label: Joi.string().trim().max(40).allow('', null),
});

const contactNoteSchema = Joi.object({
  contact_note: Joi.string().trim().allow('', null),
  status: Joi.string().valid('done', 'scheduled', 'cancelled').default('done'),
  follow_up_months: Joi.number().integer().valid(0, 3).default(3),
});

const rescheduleMeetingSchema = Joi.object({
  slot_start: Joi.date().iso().required(),
  slot_end: Joi.date().iso().greater(Joi.ref('slot_start')).required(),
  table_label: Joi.string().trim().max(40).allow('', null),
  location: Joi.string().trim().max(200).allow('', null),
});

module.exports = {
  registerSchema,
  reviewParticipantSchema,
  createMeetingSchema,
  contactNoteSchema,
  rescheduleMeetingSchema,
};
