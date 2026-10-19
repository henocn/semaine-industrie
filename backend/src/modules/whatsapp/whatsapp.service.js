'use strict';

const env = require('../../config/env');
const logger = require('../../utils/logger');

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/* Construit la réponse texte selon le message reçu. */
function buildReply(text) {
  const lower = String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (lower === '1' || lower.includes('programme')) {
    return "Programme : https://semaineindustrie.tg/programme\nJournée phare : vendredi 20 novembre.";
  }
  if (lower === '2' || lower.includes('label')) {
    return 'Demander le label : https://semaineindustrie.tg/label';
  }
  if (lower === '3' || lower.includes('carte')) {
    return 'Carte des visites : https://semaineindustrie.tg/carte';
  }
  if (lower === '4' || lower.includes('contact')) {
    return 'Contact organisation : https://semaineindustrie.tg/#contact';
  }
  if (lower === '5' || lower.includes('industrie')) {
    return 'Fiches industries : https://semaineindustrie.tg/industrie';
  }
  if (lower === '6' || lower.includes('affaire') || lower.includes('b2b')) {
    return 'Espace affaires : https://semaineindustrie.tg/affaires';
  }
  if (lower === '7' || lower.includes('vote')) {
    return 'Vote : https://semaineindustrie.tg/vote';
  }

  return (
    "Semaine de l'industrie 2026\n" +
    '16-22 novembre · Togo\n\n' +
    'Répondez :\n' +
    '1 Programme\n' +
    '2 Label\n' +
    '3 Carte\n' +
    '4 Contact\n' +
    '5 Industrie\n' +
    '6 Affaires\n' +
    '7 Vote'
  );
}

/* Extrait le premier message texte utile du payload webhook Meta. */
function extractInbound(body) {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value || {};
  const msg = value.messages?.[0];
  if (!msg || msg.type !== 'text' || !msg.text?.body) {
    return null;
  }
  const phoneNumberId =
    value.metadata?.phone_number_id || env.WHATSAPP_PHONE_NUMBER_ID || '';
  return {
    from: String(msg.from || ''),
    text: String(msg.text.body || ''),
    phoneNumberId,
  };
}

/* Envoie un message texte via WhatsApp Cloud API. */
async function sendText({ to, body, phoneNumberId }) {
  const token = env.WHATSAPP_TOKEN;
  const id = phoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !id) {
    logger.warn('[whatsapp] token ou phone number id manquant');
    return { ok: false, reason: 'missing_config' };
  }

  const url = `${GRAPH_BASE}/${id}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body, preview_url: true },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.warn('[whatsapp] send failed', res.status, data);
    return { ok: false, status: res.status, data };
  }
  return { ok: true, data };
}

/* Traite un webhook entrant et répond si c'est un message texte. */
async function handleWebhook(body) {
  const inbound = extractInbound(body);
  if (!inbound || !inbound.from) {
    return { handled: false };
  }

  const reply = buildReply(inbound.text);
  const sent = await sendText({
    to: inbound.from,
    body: reply,
    phoneNumberId: inbound.phoneNumberId,
  });

  return {
    handled: true,
    from: inbound.from,
    text: inbound.text,
    sent,
  };
}

/* Vérifie le challenge webhook Meta (hub.challenge). */
function verifyChallenge(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && token && token === env.WHATSAPP_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

module.exports = {
  buildReply,
  extractInbound,
  sendText,
  handleWebhook,
  verifyChallenge,
};
