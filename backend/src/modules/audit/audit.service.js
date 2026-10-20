'use strict';

const { AuditEvent, User } = require('../../models');

/* Enregistre une action métier (qui / quoi / quand). */
async function recordEvent({
  user,
  action,
  entityType,
  entityId,
  summary,
  meta,
}) {
  try {
    const actor = user || {};
    let actor_name = null;
    if (actor.id) {
      const row = await User.findByPk(actor.id, {
        attributes: ['first_name', 'last_name', 'email'],
      });
      if (row) {
        actor_name = `${row.first_name} ${row.last_name}`.trim();
        actor.email = actor.email || row.email;
      }
    }

    await AuditEvent.create({
      user_id: actor.id || null,
      actor_email: actor.email || null,
      actor_name,
      action: String(action || 'update').slice(0, 40),
      entity_type: String(entityType || 'unknown').slice(0, 60),
      entity_id: entityId != null ? String(entityId).slice(0, 80) : null,
      summary: String(summary || action || 'Action').slice(0, 500),
      meta: meta || null,
    });
  } catch {
    /* l'audit ne doit jamais casser la requête métier */
  }
}

/* Liste les événements d'audit (plus récents d'abord). */
async function listEvents({ limit = 100 } = {}) {
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const rows = await AuditEvent.findAll({
    order: [['created_at', 'DESC']],
    limit: n,
  });
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    actor_email: r.actor_email,
    actor_name: r.actor_name,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    summary: r.summary,
    meta: r.meta,
    created_at: r.created_at || r.createdAt,
  }));
}

module.exports = { recordEvent, listEvents };
