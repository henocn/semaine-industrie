'use strict';

const whatsappService = require('./whatsapp.service');
const logger = require('../../utils/logger');

/* Répond au challenge de vérification du webhook Meta. */
function verify(req, res) {
  const challenge = whatsappService.verifyChallenge(req.query);
  if (challenge != null) {
    return res.status(200).send(String(challenge));
  }
  return res.status(403).send('Forbidden');
}

/* Reçoit les événements WhatsApp et répond en arrière-plan. */
async function webhook(req, res) {
  // Meta exige une réponse rapide 200 avant le traitement métier.
  res.status(200).json({ success: true });

  try {
    const result = await whatsappService.handleWebhook(req.body);
    if (result.handled) {
      logger.info('[whatsapp] reply', {
        from: result.from,
        text: result.text,
        ok: result.sent?.ok,
      });
    }
  } catch (err) {
    logger.warn('[whatsapp] webhook error', err.message);
  }
}

module.exports = {
  verify,
  webhook,
};
