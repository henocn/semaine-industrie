'use strict';

const { Router } = require('express');
const Joi = require('joi');
const validate = require('../../middlewares/validate.middleware');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const { streamAnswer } = require('./chatbot.service');

const router = Router();
const PING_MS = 15000;
const WINDOWS = [
  { ms: 60 * 1000, max: 12 },
  { ms: 24 * 60 * 60 * 1000, max: 150 },
];
const hits = new Map();

const messageSchema = Joi.object({
  query: Joi.string().trim().min(1).max(1000).required(),
  visitor_id: Joi.string().uuid().required(),
  conversation_id: Joi.string().uuid().allow('', null),
});

/* Limite les messages par adresse, chaque réponse ayant un coût. */
function limitMessages(req, res, next) {
  const ip = req.ip || 'inconnu';
  const now = Date.now();
  const longest = WINDOWS[WINDOWS.length - 1].ms;
  const recent = (hits.get(ip) || []).filter((at) => now - at < longest);
  if (WINDOWS.some(({ ms, max }) => recent.filter((at) => now - at < ms).length >= max)) {
    return next(ApiError.badRequest('Vous avez envoyé beaucoup de messages. Réessayez un peu plus tard.'));
  }
  recent.push(now);
  hits.set(ip, recent);
  return next();
}

/* Répond en flux : une ligne d'attente régulière évite la coupure par le proxy si le modèle tarde. */
router.post('/messages', limitMessages, validate(messageSchema), async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  const emit = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  const ping = setInterval(() => res.write(': attente\n\n'), PING_MS);
  const client = new AbortController();
  res.on('close', () => client.abort());

  try {
    await streamAnswer({
      query: req.body.query,
      conversationId: req.body.conversation_id,
      visitorId: req.body.visitor_id,
      signal: client.signal,
      emit,
    });
  } catch (err) {
    if (!client.signal.aborted) {
      logger.warn('[chatbot] réponse interrompue', err.name);
      emit({ type: 'error' });
    }
  } finally {
    clearInterval(ping);
    res.end();
  }
});

module.exports = router;
