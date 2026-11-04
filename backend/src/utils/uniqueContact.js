'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const ApiError = require('./ApiError');

const FOLLOW_UP = 'Retrouvez votre dossier dans Mon espace avec votre code de suivi.';
const MESSAGES = {
  email: `Cette adresse e-mail est déjà utilisée pour une inscription. ${FOLLOW_UP}`,
  phone: `Ce numéro de téléphone est déjà utilisé pour une inscription. ${FOLLOW_UP}`,
  name: `Ce nom est déjà inscrit. ${FOLLOW_UP}`,
};

/* Clés de comparaison, identiques aux index uniques de la migration. */
const digits = (x) => `regexp_replace(${x}, '\\D', '', 'g')`;
const KEYS = {
  email: (x) => `lower(trim(${x}))`,
  phone: (x) => `(CASE WHEN ${digits(x)} ~ '^[0-9]{8}$' THEN '228' || ${digits(x)} ELSE ${digits(x)} END)`,
  name: (x) => `regexp_replace(trim(translate(lower(${x}), 'àâäáãéèêëíìîïóòôöõúùûüçñ’', 'aaaaaeeeeiiiiooooouuuucn''')), '\\s+', ' ', 'g')`,
};

const SECTIONS = {
  participations: {
    table: 'participations',
    columns: { email: 'email', phone: 'phone', name: 'name' },
  },
  business: {
    table: 'business_participants',
    columns: { email: 'email', phone: 'phone', name: "COALESCE(NULLIF(trim(organization_name), ''), contact_name)" },
  },
};

/* Refuse un e-mail, un numéro ou un nom déjà présent dans la section. */
async function assertAvailable(section, { kind = null, excludeId = null, ...values }) {
  const { table, columns } = SECTIONS[section];
  for (const field of Object.keys(KEYS)) {
    const value = String(values[field] ?? '').trim();
    if (!value) continue;
    const rows = await sequelize.query(
      `SELECT 1 FROM ${table}
       WHERE ${KEYS[field](columns[field])} = ${KEYS[field](':value')}
       ${kind ? 'AND kind = :kind' : ''}
       ${excludeId ? 'AND id <> :excludeId' : ''}
       LIMIT 1`,
      { type: QueryTypes.SELECT, replacements: { value, kind, excludeId } },
    );
    if (rows.length) throw ApiError.conflict(MESSAGES[field]);
  }
}

/* Deux envois simultanés passent le contrôle : l'index unique tranche et donne le même message. */
function duplicateError(err) {
  const match = String(err?.parent?.constraint || '').match(/^(?:participations|business_participants)_unique_(email|phone|name)$/);
  return match ? ApiError.conflict(MESSAGES[match[1]]) : err;
}

module.exports = { assertAvailable, duplicateError };
