'use strict';

const { AuditEvent } = require('../../models');

/*
 * Inscriptions des particuliers aux visites : ouvertes ou fermées par une case des Paramètres du backoffice.
 * Chaque changement ajoute une ligne dans audit_events (qui, quand) ; la dernière fait foi.
 * Sans aucune ligne : fermées (état en ligne au moment où la case a été créée).
 * Gardé en mémoire après la première lecture (une seule API en production).
 */
const SETTING = { entity_type: 'setting', entity_id: 'particulier_registration_open' };
const ACTIONS = { true: 'registration_opened', false: 'registration_closed' };
let cache = null;

async function isParticulierOpen() {
  if (cache === null) {
    const last = await AuditEvent.findOne({
      where: { ...SETTING, action: Object.values(ACTIONS) },
      order: [['created_at', 'DESC']],
      attributes: ['action'],
    });
    cache = last ? last.action === ACTIONS.true : false;
  }
  return cache;
}

/* Ouvre ou ferme les inscriptions des particuliers, et le note. */
async function setParticulierOpen(open, user = {}) {
  const value = Boolean(open);
  await AuditEvent.create({
    ...SETTING,
    user_id: user.id || null,
    actor_email: user.email || null,
    action: ACTIONS[value],
    summary: `Inscriptions des particuliers aux visites ${value ? 'ouvertes' : 'fermées'}`,
  });
  cache = value;
  return { particulier_open: value };
}

module.exports = { isParticulierOpen, setParticulierOpen };
