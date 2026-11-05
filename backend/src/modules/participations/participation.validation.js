'use strict';

const Joi = require('joi');
const { phone } = require('../../utils/phone');

/* École / centre / université (« ecole ») ou personne seule (« particulier »). */
const kind = Joi.string().valid('ecole', 'particulier');
const status = Joi.string().valid('pending', 'approved', 'rejected');

const fields = {
  name: Joi.string().trim().min(2).max(200),
  email: Joi.string().trim().email().max(180).allow('', null),
  phone: phone().allow('', null),
  description: Joi.string().trim().max(8000).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  headcount: Joi.number().integer().min(1).max(5000).allow(null),
};

/* Création d'une participation depuis le backoffice. */
const createSchema = Joi.object({
  kind: kind.required(),
  name: fields.name.required(),
  email: fields.email,
  phone: fields.phone,
  description: fields.description,
  city: fields.city,
  address: fields.address,
  lat: fields.lat,
  lng: fields.lng,
  headcount: fields.headcount,
});

/* Champ obligatoire pour une école à l'inscription publique. */
const requiredForSchool = (field, message) => field.when('kind', {
  is: 'ecole',
  then: Joi.number().invalid(null).required().messages({ 'any.required': message, 'any.invalid': message }),
});

/* Inscription publique : téléphone obligatoire ; position et effectif pour une école, adresse pour un particulier. */
const publicSchema = createSchema.keys({
  phone: phone().required(),
  lat: requiredForSchool(fields.lat, 'Placez votre établissement sur la carte'),
  lng: requiredForSchool(fields.lng, 'Placez votre établissement sur la carte'),
  headcount: requiredForSchool(fields.headcount, 'Indiquez l’effectif souhaité'),
  address: fields.address.when('kind', {
    is: 'particulier',
    then: Joi.string().trim().min(2).max(500).invalid('', null).required().messages({
      'any.required': 'Indiquez votre ville et votre quartier',
      'any.invalid': 'Indiquez votre ville et votre quartier',
      'string.empty': 'Indiquez votre ville et votre quartier',
    }),
  }),
});

/* Mise à jour d'une participation. */
const updateSchema = Joi.object({
  name: fields.name,
  email: fields.email,
  phone: fields.phone,
  description: fields.description,
  city: fields.city,
  address: fields.address,
  lat: fields.lat,
  lng: fields.lng,
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
