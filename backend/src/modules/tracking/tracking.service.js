'use strict';

const { QueryTypes, Op } = require('sequelize');
const { sequelize, Organization, Passport, BusinessParticipant } = require('../../models');

const START = 2001;
const PREFIXES = ['EC', 'PA', 'AF', 'IN'];

/* Normalise un code de suivi (majuscules, sans espaces). */
function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/* Vrai si le texte ressemble à un code actuel ou ancien. */
function isKnownCodeShape(raw) {
  const code = normalizeCode(raw);
  return (
    /^(?:SI\d{2}|EC|PA|AF|IN)-\d{4}$/.test(code)
    || /^P[A-F0-9]{6}$/.test(code)
    || /^SI-DEMO-[A-Z0-9]+$/.test(code)
  );
}

/* Extrait le premier code de suivi d'un texte libre. */
function extractCode(text) {
  const upper = String(text || '').toUpperCase();
  const match = upper.match(/\b(?:SI\d{2}|EC|PA|AF|IN)-\d{4}\b/)
    || upper.match(/\bP[A-F0-9]{6}\b/)
    || upper.match(/\bSI-DEMO-[A-Z0-9]+\b/);
  return match ? match[0] : null;
}

/* Préfixe selon le groupe (écoles, particuliers, affaires, industrie). */
function prefixFor(group) {
  if (group === 'ecole' || group === 'group') return 'EC';
  if (group === 'particulier' || group === 'individual') return 'PA';
  if (group === 'affaires' || group === 'business') return 'AF';
  return 'IN';
}

/* Attribue le prochain code du préfixe, de façon concurrente (UPSERT). */
async function nextCode(prefix, transaction) {
  const key = String(prefix || '').toUpperCase();
  if (!PREFIXES.includes(key)) {
    throw new Error(`Préfixe de suivi invalide : ${key}`);
  }
  const [row] = await sequelize.query(
    `INSERT INTO tracking_counters (prefix, last_value)
     VALUES (:prefix, :start)
     ON CONFLICT (prefix) DO UPDATE
     SET last_value = tracking_counters.last_value + 1
     RETURNING last_value`,
    {
      replacements: { prefix: key, start: START },
      transaction,
      type: QueryTypes.SELECT,
    },
  );
  return `${key}-${String(row.last_value).padStart(4, '0')}`;
}

/* Filtre code actuel ou ancien. */
function currentOrLegacy(field, legacyField, code) {
  return { [Op.or]: [{ [field]: code }, { [legacyField]: code }] };
}

/* Retrouve une fiche par code actuel ou legacy, sans tenir compte de la casse. */
async function findByCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return null;

  const organization = await Organization.findOne({
    where: {
      ...currentOrLegacy('label_code', 'legacy_code', code),
      label_status: 'approved',
      is_active: true,
    },
  });
  if (organization) return { kind: 'organization', organization };

  const passport = await Passport.findOne({
    where: {
      ...currentOrLegacy('code', 'legacy_code', code),
      is_active: true,
    },
  });
  if (passport) return { kind: 'passport', passport };

  const participant = await BusinessParticipant.findOne({
    where: currentOrLegacy('tracking_code', 'legacy_code', code),
  });
  if (participant) return { kind: 'business', participant };

  return null;
}

module.exports = {
  START,
  PREFIXES,
  normalizeCode,
  isKnownCodeShape,
  extractCode,
  prefixFor,
  nextCode,
  findByCode,
};
