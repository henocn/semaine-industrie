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
});

const reviewParticipantSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
});

const createMeetingSchema = Joi.object({
  participant_a_id: Joi.string().uuid().required(),
  participant_b_id: Joi.string().uuid().required(),
  slot_start: Joi.date().iso().required(),
  slot_end: Joi.date().iso().greater(Joi.ref('slot_start')).required(),
  table_label: Joi.string().trim().max(40).allow('', null),
});

const contactNoteSchema = Joi.object({
  contact_note: Joi.string().trim().allow('', null),
  status: Joi.string().valid('done', 'scheduled', 'cancelled').default('done'),
  follow_up_months: Joi.number().integer().valid(0, 3).default(3),
});

module.exports = {
  registerSchema,
  reviewParticipantSchema,
  createMeetingSchema,
  contactNoteSchema,
};
