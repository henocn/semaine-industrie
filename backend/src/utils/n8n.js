'use strict';

const env = require('../config/env');
const logger = require('./logger');

/* Envoie un événement vers n8n (no-op si webhook non configuré). */
async function notifyN8n(event, payload = {}) {
  const url = env.N8N_WEBHOOK_URL;
  if (!url) {
    logger.info('[n8n stub]', event, Object.keys(payload));
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        source: 'semaine-industrie-api',
        at: new Date().toISOString(),
        payload,
      }),
    });
    if (!res.ok) {
      logger.warn('[n8n] HTTP', res.status);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    logger.warn('[n8n] failed', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { notifyN8n };
