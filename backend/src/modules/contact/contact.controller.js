'use strict';

const { sendContactMail } = require('../../utils/mailer');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');

/* Reçoit le formulaire contact public → infos@. */
async function submit(req, res, next) {
  try {
    const { name, organization, email, message } = req.body;
    const result = await sendContactMail({
      fromName: name,
      fromEmail: email,
      subject: organization
        ? `Contact site — ${name} (${organization})`
        : `Contact site — ${name}`,
      message,
    });
    if (!result.ok && result.reason === 'smtp_not_configured') {
      throw ApiError.badRequest(
        'Messagerie temporairement indisponible. Écrivez à infos@semaineindustrie.tg',
      );
    }
    if (!result.ok) {
      throw ApiError.badRequest('Envoi impossible pour le moment');
    }
    return ApiResponse.created(res, { ok: true }, 'Message envoyé');
  } catch (err) {
    return next(err);
  }
}

module.exports = { submit };
