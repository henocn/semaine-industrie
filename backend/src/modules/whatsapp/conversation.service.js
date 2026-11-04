'use strict';

const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize, WhatsappMessage } = require('../../models');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');

const TEMPLATES_FILE = path.join(__dirname, '../../../../deploy/whatsapp-templates.json');
const THREAD_LIMIT = 500;

/* Libellé des messages reçus sans texte. */
const MEDIA_LABELS = {
  image: 'Image',
  audio: 'Message vocal',
  video: 'Vidéo',
  document: 'Document',
  sticker: 'Autocollant',
  location: 'Position',
  contacts: 'Contact',
  reaction: 'Réaction',
};

let templateBodies = null;

/* Texte connu d'un modèle Meta, lu une seule fois. */
function templateBody(name) {
  if (!templateBodies) {
    templateBodies = new Map();
    try {
      const { templates } = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8'));
      for (const template of templates) {
        const body = template.components?.find((component) => component.type === 'BODY');
        if (body?.text) templateBodies.set(template.name, body.text);
      }
    } catch (err) {
      logger.warn('[whatsapp] textes des modèles illisibles', err.message);
    }
  }
  return templateBodies.get(name);
}

/* Modèle Meta tel que reçu ; à défaut de texte connu, son nom et ses valeurs. */
function templateText(template) {
  const body = template.components?.find((component) => component.type === 'body');
  const params = (body?.parameters || []).map((param) => param.text);
  const known = templateBody(template.name);
  if (known) return known.replace(/\{\{(\d+)\}\}/g, (match, index) => params[index - 1] ?? match);
  return `Modèle ${template.name}${params.length ? ` : ${params.join(', ')}` : ''}`;
}

/* Message à boutons ou à liste : texte puis choix proposés. */
function interactiveText(interactive) {
  const choices = interactive.type === 'list'
    ? (interactive.action?.sections || []).flatMap((section) => section.rows || []).map((row) => row.title)
    : (interactive.action?.buttons || []).map((button) => button.reply?.title);
  return [
    interactive.header?.text,
    interactive.body?.text,
    choices.length ? `Choix : ${choices.join(', ')}` : null,
  ].filter(Boolean).join('\n');
}

/* Texte lisible d'un message envoyé par le bot. */
function outboundText(payload) {
  switch (payload.type) {
    case 'text': return payload.text?.body || '';
    case 'interactive': return interactiveText(payload.interactive || {});
    case 'template': return templateText(payload.template || {});
    case 'image': return ['[Image]', payload.image?.caption].filter(Boolean).join(' ');
    case 'document': return ['[Document]', payload.document?.filename, payload.document?.caption].filter(Boolean).join(' ');
    default: return `[${payload.type || 'Message'}]`;
  }
}

/* Texte lisible d'un message reçu. */
function inboundText(message) {
  if (message.type === 'text') return message.text?.body || '';
  if (message.type === 'interactive') {
    const reply = message.interactive?.button_reply || message.interactive?.list_reply;
    return reply?.title || '[Choix]';
  }
  if (message.type === 'button') return message.button?.text || '[Bouton]';
  const label = MEDIA_LABELS[message.type] || message.type || 'Message';
  const caption = message[message.type]?.caption;
  return [`[${label}]`, caption].filter(Boolean).join(' ');
}

/* Garde un message ; une erreur ici ne doit jamais gêner le bot. */
async function store(row) {
  try {
    await WhatsappMessage.bulkCreate([{ ...row, sent_at: new Date() }], { ignoreDuplicates: true });
  } catch (err) {
    logger.warn('[whatsapp] message non enregistré', err.message);
  }
}

/* Enregistre le message reçu d'une notification Meta. */
function recordInbound(envelope) {
  const message = envelope.messages[0];
  const contact = envelope.contacts?.find((item) => item.wa_id === message.from) || envelope.contacts?.[0];
  return store({
    phone: String(message.from).replace(/\D/g, ''),
    direction: 'in',
    body: inboundText(message),
    profile_name: contact?.profile?.name || null,
    wa_message_id: message.id || null,
  });
}

/* Enregistre un message accepté par Meta. */
function recordOutbound(payload, data) {
  return store({
    phone: String(payload.to).replace(/\D/g, ''),
    direction: 'out',
    body: outboundText(payload),
    wa_message_id: data?.messages?.[0]?.id || null,
  });
}

/* Une ligne par numéro, de la plus récente à la plus ancienne. */
function listConversations() {
  return sequelize.query(
    `SELECT s.phone, s.messages, s.last_at, n.profile_name, l.body AS last_body, l.direction AS last_direction
     FROM (
       SELECT phone, COUNT(*)::int AS messages, MAX(sent_at) AS last_at
       FROM whatsapp_messages GROUP BY phone
     ) s
     LEFT JOIN LATERAL (
       SELECT body, direction FROM whatsapp_messages m
       WHERE m.phone = s.phone ORDER BY sent_at DESC LIMIT 1
     ) l ON TRUE
     LEFT JOIN LATERAL (
       SELECT profile_name FROM whatsapp_messages m
       WHERE m.phone = s.phone AND profile_name IS NOT NULL ORDER BY sent_at DESC LIMIT 1
     ) n ON TRUE
     ORDER BY s.last_at DESC`,
    { type: QueryTypes.SELECT },
  );
}

/* Derniers messages d'un numéro, du plus ancien au plus récent. */
async function getConversation(phone) {
  if (!/^\d{6,20}$/.test(String(phone))) throw ApiError.badRequest('Numéro invalide');
  const rows = await WhatsappMessage.findAll({
    where: { phone },
    attributes: ['id', 'direction', 'body', 'sent_at'],
    order: [['sent_at', 'DESC']],
    limit: THREAD_LIMIT,
  });
  return rows.reverse();
}

module.exports = {
  recordInbound,
  recordOutbound,
  listConversations,
  getConversation,
};
