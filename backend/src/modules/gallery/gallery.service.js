'use strict';

const { Participation, Passport } = require('../../models');
const trackingService = require('../tracking/tracking.service');

/* Inscriptions qui ouvrent la galerie photo : écoles, particuliers, Palais, médias. */
const GALLERY_KINDS = ['ecole', 'particulier', 'palais', 'media'];

/* Vérifie un code pour la galerie : valide seulement si l'inscription est acceptée. Aucune donnée personnelle renvoyée. */
async function checkCode(rawCode) {
  const code = trackingService.normalizeCode(rawCode);
  if (!/^(?:EC|PA|JP|MD)-[A-Z0-9]{4}$/.test(code) && !/^P[A-F0-9]{6}$/.test(code)) {
    return { valid: false, reason: 'unknown' };
  }
  let row = await Participation.findOne({
    where: { kind: GALLERY_KINDS, tracking_code: code },
    attributes: ['kind', 'status'],
  });
  if (!row) {
    /* Anciens passeports : le QR porte le code du passeport. */
    const passport = await Passport.findOne({ where: { code }, attributes: ['id'] });
    if (passport) {
      row = await Participation.findOne({
        where: { kind: GALLERY_KINDS, passport_id: passport.id },
        attributes: ['kind', 'status'],
      });
    }
  }
  if (!row) return { valid: false, reason: 'unknown' };
  if (row.status !== 'approved') return { valid: false, reason: 'pending', kind: row.kind };
  return { valid: true, kind: row.kind };
}

module.exports = { checkCode, GALLERY_KINDS };
