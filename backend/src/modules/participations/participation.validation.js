'use strict';

const Joi = require('joi');
const { phone } = require('../../utils/phone');

/* Lecture seule : l'enum DB garde encore « particulier » pour l'historique. */
const kind = Joi.string().valid('ecole', 'particulier');
/* Nouvelles inscriptions : écoles / centres / univ uniquement. */
const kindCreate = Joi.string().valid('ecole');
const status = Joi.string().valid('pending', 'approved', 'rejected');

const fields = {
  name: Joi.string().trim().min(2).max(200),
  email: Joi.string().trim().email().max(180).allow('', null),
  phone: phone().allow('', null),
  description: Joi.string().trim().max(8000).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  headcount: Joi.number().integer().min(1).max(5000).allow(null),
};

/* Création d'une participation depuis le backoffice (écoles uniquement). */
const createSchema = Joi.object({
  kind: kindCreate.required(),
  name: fields.name.required(),
  email: fields.email,
  phone: fields.phone,
  description: fields.description,
  city: fields.city,
  headcount: fields.headcount,
});

/* Inscription publique : téléphone obligatoire, écoles uniquement. */
const publicSchema = createSchema.keys({
  phone: phone().required(),
});

/* Mise à jour d'une participation. */
const updateSchema = Joi.object({
  name: fields.name,
  email: fields.email,
  phone: fields.phone,
  description: fields.description,
  city: fields.city,
  headcount: fields.headcount,
}).min(1);

/* Filtres de la liste. */
const listSchema = Joi.object({
  kind,
  status,
});

module.exports = {
  createSchema,
  publicSchema,
  updateSchema,
  listSchema,
};
