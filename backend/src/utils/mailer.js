'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

let transporter = null;

/* Indique si le SMTP est configuré (mot de passe renseigné). */
function isMailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

/* Crée (ou réutilise) le transporteur SMTP SiteGround. */
function getTransporter() {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 465,
    secure: env.SMTP_SECURE !== 'false',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return transporter;
}

/* Envoie un e-mail transactionnel (no-reply). */
async function sendNotifyMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('[mail] SMTP non configuré, e-mail ignoré', subject, to);
    return { ok: false, reason: 'smtp_not_configured' };
  }
  try {
    const info = await tx.sendMail({
      from: env.MAIL_FROM_NOTIFY,
      to,
      subject,
      text,
      html: html || undefined,
      replyTo: env.MAIL_TO_CONTACT,
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    logger.warn('[mail] envoi notify échoué', err.message);
    return { ok: false, reason: err.message };
  }
}

/* Envoie un message de contact vers info@ (formulaire public). */
async function sendContactMail({ fromName, fromEmail, subject, message }) {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('[mail] SMTP non configuré, contact ignoré');
    return { ok: false, reason: 'smtp_not_configured' };
  }
  try {
    const info = await tx.sendMail({
      from: env.MAIL_FROM_CONTACT,
      to: env.MAIL_TO_CONTACT,
      replyTo: `${fromName} <${fromEmail}>`,
      subject: subject || `Contact site : ${fromName}`,
      text: [
        `De : ${fromName} <${fromEmail}>`,
        '',
        message || '',
      ].join('\n'),
    });
    return { ok: true, id: info.messageId };
  } catch (err) {
    logger.warn('[mail] envoi contact échoué', err.message);
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  isMailConfigured,
  sendNotifyMail,
  sendContactMail,
};
