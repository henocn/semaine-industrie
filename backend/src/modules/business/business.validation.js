'use strict';

const Joi = require('joi');
const { phone } = require('../../utils/phone');

const MIN_NOTE_WORDS = 30;
const NOTE_MESSAGE = `Décrivez votre demande en ${MIN_NOTE_WORDS} mots au moins`;

/* Champs communs d'un participant ; offers / seeks / country restent acceptés pour les anciens formulaires. */
const participantFields = {
  kind: Joi.string().valid('entreprise', 'particulier'),
  organization_name: Joi.string().trim().min(2).max(200).allow('', null),
  contact_name: Joi.string().trim().min(2).max(160).allow('', null),
  email: Joi.string().trim().email().max(180),
  phone: phone().allow('', null),
  sector: Joi.string().trim().max(120).allow('', null),
  notes: Joi.string().trim().allow('', null),
  offers: Joi.string().trim().allow('', null),
  seeks: Joi.string().trim().allow('', null),
  country: Joi.string().trim().max(80).allow('', null),
};

const registerSchema = Joi.object({
  ...participantFields,
  kind: participantFields.kind.required(),
  organization_name: participantFields.organization_name.when('kind', {
    is: 'entreprise',
    then: Joi.string().trim().min(2).max(200).invalid('', null).required().messages({
      'any.required': 'Indiquez le nom de l’entreprise',
      'any.invalid': 'Indiquez le nom de l’entreprise',
      'string.empty': 'Indiquez le nom de l’entreprise',
    }),
  }),
  email: participantFields.email.required(),
  phone: phone().required(),
  notes: Joi.string().trim().required().custom((value, helpers) => (
    value.split(/\s+/).filter(Boolean).length < MIN_NOTE_WORDS ? helpers.error('notes.tooShort') : value
  )).messages({
    'any.required': NOTE_MESSAGE,
    'string.empty': NOTE_MESSAGE,
    'notes.tooShort': NOTE_MESSAGE,
  }),
  contact_opt_in: Joi.boolean().valid(true).required(),
});

/* Ajout manuel orga (approuvé par défaut). */
const createParticipantOrgaSchema = Joi.object({
  ...participantFields,
  kind: participantFields.kind.required(),
  email: participantFields.email.required(),
  contact_opt_in: Joi.boolean().default(true),
  status: Joi.string().valid('pending', 'approved').default('approved'),
});

/* Modification orga d'un participant. */
const updateParticipantSchema = Joi.object(participantFields).min(1);

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
  createParticipantOrgaSchema,
  updateParticipantSchema,
  reviewParticipantSchema,
  createMeetingSchema,
  contactNoteSchema,
  rescheduleMeetingSchema,
};
