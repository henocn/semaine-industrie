'use strict';

const Joi = require('joi');
const { phone } = require('../../utils/phone');
const { DAY_NUMBERS } = require('./palais');
const { PROFILE_VALUES } = require('./media');

/* École / université (« ecole »), particulier aux visites (« particulier »), au Palais (« palais ») ou accréditation média (« media »). */
const kind = Joi.string().valid('ecole', 'particulier', 'palais', 'media');
const OUTLET_MESSAGE = 'Indiquez le nom du média, de la chaîne ou du compte';
const PALAIS_DAYS_MESSAGE = 'Choisissez au moins une journée';
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
  palais_days: Joi.array().items(Joi.number().integer().valid(...DAY_NUMBERS)).unique().min(1).max(DAY_NUMBERS.length)
    .messages({ 'array.min': PALAIS_DAYS_MESSAGE, 'array.includesRequiredUnknowns': PALAIS_DAYS_MESSAGE }),
  media_outlet: Joi.string().trim().min(2).max(160)
    .messages({ 'string.empty': OUTLET_MESSAGE, 'string.min': OUTLET_MESSAGE }),
  media_profile: Joi.string().valid(...PROFILE_VALUES),
};

/* Média et profil obligatoires pour une accréditation, ignorés sinon. */
const mediaOutlet = Joi.any().when('kind', {
  is: 'media',
  then: fields.media_outlet.required().messages({ 'any.required': OUTLET_MESSAGE }),
  otherwise: Joi.any().strip(),
});
const mediaProfile = Joi.any().when('kind', {
  is: 'media',
  then: fields.media_profile.required().messages({ 'any.required': 'Choisissez votre profil' }),
  otherwise: Joi.any().strip(),
});

/* Journées obligatoires pour une inscription au Palais, ignorées sinon. */
const palaisDays = fields.palais_days.when('kind', {
  is: 'palais',
  then: Joi.required().messages({ 'any.required': PALAIS_DAYS_MESSAGE }),
  otherwise: Joi.any().strip(),
});

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
  palais_days: palaisDays,
  media_outlet: mediaOutlet,
  media_profile: mediaProfile,
});

/* Nombre minimal de mots attendu pour décrire la couverture d'une accréditation média. */
const MEDIA_COVERAGE_MIN_WORDS = 10;
const SHORT_COVERAGE_MESSAGE = 'Texte trop court : décrivez un peu plus ce que vous prévoyez de couvrir.';

/* Compte les mots d'un texte libre. */
function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/* Couverture d'un média : obligatoire et assez détaillée ; texte libre facultatif pour les autres formulaires. */
const publicDescription = Joi.when('kind', {
  is: 'media',
  then: Joi.string().trim().max(8000).required()
    .custom((value, helpers) => (wordCount(value) < MEDIA_COVERAGE_MIN_WORDS ? helpers.error('coverage.short') : value))
    .messages({
      'any.required': 'Indiquez ce que vous prévoyez de couvrir',
      'string.empty': 'Indiquez ce que vous prévoyez de couvrir',
      'coverage.short': SHORT_COVERAGE_MESSAGE,
    }),
  otherwise: fields.description,
});

/* Champ obligatoire pour une école à l'inscription publique. */
const requiredForSchool = (field, message) => field.when('kind', {
  is: 'ecole',
  then: Joi.number().invalid(null).required().messages({ 'any.required': message, 'any.invalid': message }),
});

/* Inscription publique : e-mail et téléphone obligatoires ; position et effectif pour une école, adresse pour un particulier,
   couverture détaillée pour un média. */
const publicSchema = createSchema.keys({
  email: Joi.string().trim().email().max(180).required().messages({
    'any.required': 'Indiquez votre adresse e-mail',
    'string.empty': 'Indiquez votre adresse e-mail',
    'string.email': 'Adresse e-mail invalide',
  }),
  phone: phone().required(),
  description: publicDescription,
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
  palais_days: fields.palais_days,
  media_outlet: fields.media_outlet,
  media_profile: fields.media_profile,
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
