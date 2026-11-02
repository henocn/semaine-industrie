'use strict';

const Joi = require('joi');

/* « + » + indicatif + numéro : 8 à 15 chiffres, séparés ou non par espace, point ou tiret. */
const PHONE_RE = /^\+(?:[ .-]*\d){8,15}$/;

/* Téléphone international (ex. +228 90 12 34 56). */
const phone = () =>
  Joi.string()
    .trim()
    .max(40)
    .pattern(PHONE_RE)
    .messages({
      'string.pattern.base': 'Téléphone au format +indicatif puis le numéro, ex. +228 90 12 34 56',
    });

module.exports = { PHONE_RE, phone };
