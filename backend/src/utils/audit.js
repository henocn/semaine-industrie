'use strict';

const auditService = require('../modules/audit/audit.service');

/* Helper court pour enregistrer un événement depuis un controller. */
async function audit(req, { action, entityType, entityId, summary, meta }) {
  await auditService.recordEvent({
    user: req.user,
    action,
    entityType,
    entityId,
    summary,
    meta,
  });
}

module.exports = { audit };
