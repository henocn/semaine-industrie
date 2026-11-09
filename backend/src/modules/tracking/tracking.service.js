'use strict';

const crypto = require('crypto');
const { QueryTypes, Op } = require('sequelize');
const {
  sequelize, Organization, Passport, BusinessParticipant, Participation, LabelRequest,
} = require('../../models');

const START = 2001;
const PREFIXES = ['EC', 'PA', 'JP', 'AF', 'IN'];
/* Sans 0/O ni 1/I pour éviter les confusions ; 32 signes = tirage uniforme sur un octet. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 4;
const MAX_ATTEMPTS = 50;

/* Normalise un code de suivi (majuscules, sans espaces). */
function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/* Vrai si le texte ressemble à un code actuel ou ancien. */
function isKnownCodeShape(raw) {
  const code = normalizeCode(raw);
  return (
    /^(?:EC|PA|JP|AF|IN)-[A-Z0-9]{4}$/.test(code)
    || /^SI\d{2}-\d{4}$/.test(code)
    || /^P[A-F0-9]{6}$/.test(code)
    || /^SI-DEMO-[A-Z0-9]+$/.test(code)
  );
}

/* Extrait le premier code de suivi d'un texte libre. */
function extractCode(text) {
  const upper = String(text || '').toUpperCase();
  const match = upper.match(/\b(?:EC|PA|JP|AF|IN)-[A-Z0-9]{4}\b/)
    || upper.match(/\bSI\d{2}-\d{4}\b/)
    || upper.match(/\bP[A-F0-9]{6}\b/)
    || upper.match(/\bSI-DEMO-[A-Z0-9]+\b/);
  return match ? match[0] : null;
}

/* Préfixe selon le groupe (écoles, particuliers, journées du Palais, affaires, industrie). */
function prefixFor(group) {
  if (group === 'ecole' || group === 'group') return 'EC';
  if (group === 'particulier' || group === 'individual') return 'PA';
  if (group === 'palais') return 'JP';
  if (group === 'affaires' || group === 'business') return 'AF';
  return 'IN';
}

/* Tire 4 signes au hasard (lettres et chiffres). */
function randomSuffix() {
  return Array.from(crypto.randomBytes(SUFFIX_LENGTH), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

/* Vrai si le code est déjà pris (actuel ou ancien, toutes fiches confondues). */
async function isCodeTaken(code, transaction) {
  const rows = await sequelize.query(
    `SELECT 1 FROM organizations WHERE label_code = :code OR legacy_code = :code
     UNION ALL SELECT 1 FROM passports WHERE code = :code OR legacy_code = :code
     UNION ALL SELECT 1 FROM business_participants WHERE tracking_code = :code OR legacy_code = :code
     UNION ALL SELECT 1 FROM participations WHERE tracking_code = :code
     UNION ALL SELECT 1 FROM label_requests WHERE tracking_code = :code
     LIMIT 1`,
    { replacements: { code }, transaction, type: QueryTypes.SELECT },
  );
  return rows.length > 0;
}

/* Attribue un code aléatoire libre du préfixe (ex. EC-G7H5), impossible à deviner par incrément. */
async function nextCode(prefix, transaction) {
  const key = String(prefix || '').toUpperCase();
  if (!PREFIXES.includes(key)) {
    throw new Error(`Préfixe de suivi invalide : ${key}`);
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = `${key}-${randomSuffix()}`;
    if (!(await isCodeTaken(code, transaction))) return code;
  }
  throw new Error(`Aucun code de suivi libre trouvé pour ${key}`);
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

/* Retrouve un dossier sans fiche définitive : inscription ou demande en attente ou refusée. */
async function findRequestByCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return null;
  const where = { tracking_code: code, status: ['pending', 'rejected'] };
  const participation = await Participation.findOne({ where });
  if (participation) return { kind: 'participation', participation };
  const request = await LabelRequest.findOne({ where });
  if (request) return { kind: 'label', request };
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
  findRequestByCode,
};
