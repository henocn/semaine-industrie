'use strict';

const Joi = require('joi');

const visitSlotSchema = Joi.object({
  day: Joi.string().max(40).required(),
  start: Joi.string().max(10).required(),
  end: Joi.string().max(10).required(),
});

/* Chemin public d'une image uploadée. */
const imagePath = Joi.string()
  .trim()
  .pattern(/^\/uploads\/labels\/[a-zA-Z0-9._-]+$/)
  .max(500);

/* Champs réservés aux entreprises (ignorés pour les écoles). */
const entrepriseOnly = {
  sector: Joi.string().trim().max(120).allow('', null),
  products: Joi.array().items(Joi.string().trim().max(120)).default([]),
  safety_rules: Joi.string().trim().allow('', null),
  gallery_urls: Joi.array().items(imagePath).length(3).required(),
};

/* Schéma de création d'une demande de label. */
const createRequestSchema = Joi.object({
  structure_name: Joi.string().trim().min(2).max(200).required(),
  structure_type: Joi.string().valid('entreprise', 'ecole').required(),
  /* Ville / région conservés en base (rétrocompat), le formulaire public envoie address. */
  region: Joi.string().trim().max(120).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  contact_name: Joi.string().trim().max(160).allow('', null),
  contact_email: Joi.string().trim().email().max(180).required(),
  /* Téléphone = plus, jamais une condition d'accès. */
  contact_phone: Joi.string().trim().min(6).max(40).allow('', null),
  contact_opt_in: Joi.boolean().valid(true).required(),
  description: Joi.string().trim().allow('', null),
  photo_url: Joi.string().trim().max(500).allow('', null),
  visit_slots: Joi.array().items(visitSlotSchema).default([]),
  max_visitors: Joi.number().integer().min(1).max(5000).allow(null),
  sector: Joi.when('structure_type', {
    is: 'entreprise',
    then: entrepriseOnly.sector,
    otherwise: Joi.any().strip(),
  }),
  products: Joi.when('structure_type', {
    is: 'entreprise',
    then: entrepriseOnly.products,
    otherwise: Joi.any().strip(),
  }),
  safety_rules: Joi.when('structure_type', {
    is: 'entreprise',
    then: entrepriseOnly.safety_rules,
    otherwise: Joi.any().strip(),
  }),
  gallery_urls: Joi.when('structure_type', {
    is: 'entreprise',
    then: entrepriseOnly.gallery_urls,
    otherwise: Joi.any().strip(),
  }),
});

/* Schéma de modification orga d'une demande (avant acceptation). */
const updateRequestSchema = Joi.object({
  structure_name: Joi.string().trim().min(2).max(200),
  structure_type: Joi.string().valid('entreprise', 'ecole'),
  region: Joi.string().trim().max(120).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  contact_email: Joi.string().trim().email().max(180),
  contact_phone: Joi.string().trim().min(6).max(40),
  description: Joi.string().trim().allow('', null),
  max_visitors: Joi.number().integer().min(1).max(5000).allow(null),
  sector: Joi.string().trim().max(120).allow('', null),
  products: Joi.array().items(Joi.string().trim().max(120)),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  gallery_urls: Joi.array().items(imagePath).max(3),
}).min(1);

/* Création orga (sans galerie obligatoire). */
const createOrgaRequestSchema = Joi.object({
  structure_name: Joi.string().trim().min(2).max(200).required(),
  structure_type: Joi.string().valid('entreprise', 'ecole').required(),
  address: Joi.string().trim().max(500).allow('', null),
  region: Joi.string().trim().max(120).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  contact_name: Joi.string().trim().max(160).allow('', null),
  contact_email: Joi.string().trim().email().max(180).required(),
  contact_phone: Joi.string().trim().min(6).max(40).required(),
  contact_opt_in: Joi.boolean().valid(true).required(),
  description: Joi.string().trim().allow('', null),
  max_visitors: Joi.number().integer().min(1).max(5000).allow(null),
  sector: Joi.string().trim().max(120).allow('', null),
  products: Joi.array().items(Joi.string().trim().max(120)).default([]),
  visit_slots: Joi.array().items(visitSlotSchema).default([]),
});

module.exports = {
  createRequestSchema,
  createOrgaRequestSchema,
  updateRequestSchema,
};
