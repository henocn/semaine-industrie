'use strict';

const env = require('../../config/env');
const whatsappService = require('./whatsapp.service');
const conversationService = require('./conversation.service');
const mailService = require('../notifications/mail.service');
const logger = require('../../utils/logger');
const ApiResponse = require('../../utils/ApiResponse');

/* Vérifie le secret interne partagé avec n8n. */
function isInternalAuthorized(req) {
  const header = String(req.headers['x-wa-secret'] || '');
  const expected = env.WHATSAPP_VERIFY_TOKEN;
  return Boolean(expected && header && header === expected);
}

/* Répond au challenge de vérification du webhook Meta. */
function verify(req, res) {
  const challenge = whatsappService.verifyChallenge(req.query);
  if (challenge != null) {
    return res.status(200).send(String(challenge));
  }
  return res.status(403).send('Forbidden');
}

/* Reçoit les événements WhatsApp (webhook direct) et répond en arrière-plan. */
async function webhook(req, res) {
  res.status(200).json({ success: true });

  try {
    const result = await whatsappService.handleWebhook(req.body);
    if (result.handled) {
      logger.info('[whatsapp] reply', {
        from: result.from,
        text: result.text,
        interactiveId: result.interactiveId,
        ok: result.sent?.ok,
      });
    }
  } catch (err) {
    logger.warn('[whatsapp] webhook error', err.message);
  }
}

/* Point d'entrée n8n : traite le payload et répond (menus boutons / listes). */
async function inbound(req, res, next) {
  try {
    if (!isInternalAuthorized(req)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const result = await whatsappService.processInbound(req.body);
    if (!result.handled) {
      return ApiResponse.success(res, { handled: false }, 'Ignoré');
    }
    if (result.sent && result.sent.ok === false) {
      return res.status(502).json({ success: false, error: 'send_failed', data: result });
    }
    return ApiResponse.success(res, result, 'Traité');
  } catch (err) {
    return next(err);
  }
}

/* Envoie un message texte (appel interne / n8n). */
async function send(req, res, next) {
  try {
    if (!isInternalAuthorized(req)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const to = String(req.body?.to || '').trim();
    const body = String(req.body?.body || '').trim();
    const phoneNumberId = String(req.body?.phoneNumberId || '').trim();
    if (!to || !body) {
      return res.status(400).json({ success: false, error: 'to et body requis' });
    }
    const sent = await whatsappService.sendText({ to, body, phoneNumberId });
    if (!sent.ok) {
      return res.status(502).json({ success: false, error: 'send_failed', data: sent });
    }
    return ApiResponse.success(res, sent.data, 'Message envoyé');
  } catch (err) {
    return next(err);
  }
}

/* Envoie un rappel label (template) pour une organisation (interne / n8n). */
async function remindLabel(req, res, next) {
  try {
    if (!isInternalAuthorized(req)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const organization = req.body?.organization;
    if (!organization?.label_code || !organization?.contact_phone) {
      return res.status(400).json({
        success: false,
        error: 'organization.label_code et contact_phone requis',
      });
    }
    mailService.labelReminder(organization);
    const sent = await whatsappService.notifyLabelReminder(organization);
    if (!sent.ok) {
      return res.status(502).json({ success: false, error: 'send_failed', data: sent });
    }
    return ApiResponse.success(res, sent.data || sent, 'Rappel envoyé');
  } catch (err) {
    return next(err);
  }
}

/* Envoie un rappel visite (template) (interne / n8n). */
async function remindVisit(req, res, next) {
  try {
    if (!isInternalAuthorized(req)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const organization = req.body?.organization;
    if (!organization?.label_code || !organization?.contact_phone) {
      return res.status(400).json({
        success: false,
        error: 'organization.label_code et contact_phone requis',
      });
    }
    mailService.visitReminder({
      organization,
      visitDay: req.body?.visitDay,
      visitSlot: req.body?.visitSlot,
      place: req.body?.place,
    });
    const sent = await whatsappService.notifyVisitReminder({
      organization,
      visitDay: req.body?.visitDay,
      visitSlot: req.body?.visitSlot,
      place: req.body?.place,
      role: req.body?.role,
    });
    if (!sent.ok) {
      return res.status(502).json({ success: false, error: 'send_failed', data: sent });
    }
    return ApiResponse.success(res, sent.data || sent, 'Rappel visite envoyé');
  } catch (err) {
    return next(err);
  }
}

/* Liste les numéros ayant échangé avec le bot (backoffice). */
async function listConversations(req, res, next) {
  try {
    return ApiResponse.success(res, await conversationService.listConversations());
  } catch (err) {
    return next(err);
  }
}

/* Lit la conversation d'un numéro (backoffice). */
async function getConversation(req, res, next) {
  try {
    return ApiResponse.success(res, await conversationService.getConversation(req.params.phone));
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  verify,
  webhook,
  inbound,
  send,
  remindLabel,
  remindVisit,
  listConversations,
  getConversation,
};
