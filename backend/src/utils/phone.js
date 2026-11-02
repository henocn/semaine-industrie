'use strict';

const Joi = require('joi');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/* Sans indicatif, le numéro est lu comme togolais. */
const DEFAULT_COUNTRY = 'TG';

/* Téléphone valide pour son pays, enregistré au format international (+22890123456). */
const phone = () =>
  Joi.string()
    .trim()
    .max(40)
    .custom((value, helpers) => {
      if (!value) return value;
      const parsed = parsePhoneNumberFromString(value, DEFAULT_COUNTRY);
      if (!parsed || !parsed.isValid()) return helpers.error('phone.invalid');
      return parsed.number;
    })
    .messages({
      'phone.invalid': 'Numéro de téléphone invalide pour le pays choisi',
    });

module.exports = { phone };
