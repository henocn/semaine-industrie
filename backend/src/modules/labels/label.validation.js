'use strict';

const Joi = require('joi');

const visitSlotSchema = Joi.object({
  day: Joi.string().max(40).required(),
  start: Joi.string().max(10).required(),
  end: Joi.string().max(10).required(),
});

/* Schéma de création d'une demande de label. */
const createRequestSchema = Joi.object({
  structure_name: Joi.string().trim().min(2).max(200).required(),
  structure_type: Joi.string().valid('entreprise', 'ecole').required(),
  sector: Joi.string().trim().max(120).allow('', null),
  region: Joi.string().trim().max(120).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  address: Joi.string().trim().allow('', null),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  contact_name: Joi.string().trim().min(2).max(160).required(),
  contact_email: Joi.string().trim().email().max(180).required(),
  contact_phone: Joi.string().trim().max(40).allow('', null),
  description: Joi.string().trim().allow('', null),
  products: Joi.array().items(Joi.string().trim().max(120)).default([]),
  photo_url: Joi.string().trim().uri().max(500).allow('', null),
  max_visitors: Joi.number().integer().min(1).max(5000).allow(null),
  visit_slots: Joi.array().items(visitSlotSchema).default([]),
  safety_rules: Joi.string().trim().allow('', null),
});

/* Schéma de revue (validation / rejet) d'une demande. */
const reviewSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  review_note: Joi.string().trim().allow('', null),
});

module.exports = {
  createRequestSchema,
  reviewSchema,
};
