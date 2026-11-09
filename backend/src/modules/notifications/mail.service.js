'use strict';

const env = require('../../config/env');
const logger = require('../../utils/logger');
const { emails } = require('../../utils/emailTemplates');
const { sendNotifyMail } = require('../../utils/mailer');
const { renderQrCard } = require('../../utils/qrCard');
const passportService = require('../passports/passport.service');

const TIME_ZONE = 'Africa/Lome';

/* Construit et envoie un message ; une erreur est journalisée sans jamais bloquer l'appelant. */
async function deliver(to, build) {
  const address = String(to || '').trim();
  if (!address) return { ok: false, reason: 'no_email' };
  try {
    return await sendNotifyMail({ to: address, ...(await build(emails())) });
  } catch (err) {
    logger.warn('[mail] notification non envoyée', err.message);
    return { ok: false, reason: err.message };
  }
}

/* Date complète à l'heure de Lomé (ex. 4 novembre 2026). */
function longDate(value) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE })
    .format(new Date(value));
}

/* Jour de visite affiché en jj/mm/aaaa. */
function visitDate(value) {
  const text = String(value || '-');
  return text.includes('-') ? text.split('-').reverse().join('/') : text;
}

/* Heure de visite réduite à hh:mm. */
function visitHour(value) {
  return String(value || '-').slice(0, 5);
}

/* Inscription école ou particulier reçue. */
function participationReceived(row) {
  if (row.kind === 'palais') {
    return deliver(row.email, (mail) => mail.palaisReceived({ name: row.name, code: row.tracking_code, days: row.palais_days }));
  }
  if (row.kind === 'media') {
    return deliver(row.email, (mail) => mail.mediaReceived({ name: row.name, code: row.tracking_code, details: row.media_details }));
  }
  return deliver(row.email, (mail) => (row.kind === 'ecole'
    ? mail.schoolReceived({
      name: row.name,
      code: row.tracking_code,
      city: row.city,
      headcount: row.headcount,
      registeredOn: longDate(row.createdAt),
    })
    : mail.individualReceived({ name: row.name, code: row.tracking_code })));
}

/* Particulier inscrit au-delà des places : liste d'attente. */
function participationWaitlisted(row) {
  return deliver(row.email, (mail) => mail.individualWaitlisted({ name: row.name, code: row.tracking_code }));
}

/* Inscription acceptée, avec la carte QR en pièce jointe. */
function participationApproved(row, code) {
  return deliver(row.email, async (mail) => {
    const cardPng = await renderQrCard({ payload: passportService.passageQrPayload(code), name: row.name, code });
    if (row.kind === 'palais') return mail.palaisApproved({ name: row.name, code, cardPng, days: row.palais_days });
    if (row.kind === 'media') return mail.mediaApproved({ name: row.name, code, cardPng, details: row.media_details });
    return row.kind === 'ecole'
      ? mail.schoolApproved({ name: row.name, code, places: row.headcount || '-', cardPng })
      : mail.individualApproved({ name: row.name, code, cardPng });
  });
}

/* Inscription refusée. */
function participationRejected(row) {
  if (row.kind === 'media') return deliver(row.email, (mail) => mail.mediaRejected({ name: row.name }));
  return deliver(row.email, (mail) => (row.kind === 'ecole'
    ? mail.schoolRejected({ name: row.name })
    : mail.individualRejected({ name: row.name })));
}

/* Demande de label reçue. */
function labelReceived(request) {
  return deliver(request.contact_email, (mail) => mail.labelReceived({
    name: request.structure_name,
    code: request.tracking_code,
  }));
}

/* Label accordé, avec la carte QR qui mène à la fiche publique. */
function labelApproved(organization) {
  return deliver(organization.contact_email, async (mail) => {
    const cardPng = await renderQrCard({
      payload: `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/o/${organization.slug}`,
      name: organization.name,
    });
    return mail.labelApproved({ name: organization.name, code: organization.label_code, cardPng });
  });
}

/* Demande de label refusée. */
function labelRejected(request) {
  return deliver(request.contact_email, (mail) => mail.labelRejected({ name: request.structure_name }));
}

/* Rappel du code de suivi d'une structure labellisée. */
function labelReminder(organization) {
  return deliver(organization.contact_email, (mail) => mail.labelReminder({
    name: organization.name,
    code: organization.label_code,
  }));
}

/* Nom affiché d'un participant aux rencontres d'affaires. */
function businessName(participant) {
  return participant.organization_name || participant.contact_name || participant.email;
}

/* Envoie à un participant d'affaires qui a accepté d'être contacté. */
function deliverBusiness(participant, build) {
  if (participant.contact_opt_in === false) return Promise.resolve({ ok: false, reason: 'no_opt_in' });
  return deliver(participant.email, build);
}

/* Inscription aux rencontres d'affaires reçue. */
function businessReceived(participant) {
  return deliverBusiness(participant, (mail) => mail.businessReceived({
    name: businessName(participant),
    code: participant.tracking_code,
  }));
}

/* Inscription aux rencontres d'affaires acceptée. */
function businessApproved(participant) {
  return deliverBusiness(participant, (mail) => mail.businessApproved({
    name: businessName(participant),
    code: participant.tracking_code,
  }));
}

/* Inscription aux rencontres d'affaires refusée. */
function businessRejected(participant) {
  return deliverBusiness(participant, (mail) => mail.businessRejected({ name: businessName(participant) }));
}

/* Rendez-vous d'affaires fixé ou reporté. */
function businessMeeting(participant, details) {
  return deliverBusiness(participant, (mail) => mail.meeting({ code: participant.tracking_code, ...details }));
}

/* Visite programmée : l'école et le site reçoivent chacun leur message. */
function visitScheduled({ school, site, visitDay, visitStart, visitEnd, headcount }) {
  const day = visitDate(visitDay);
  const slot = `${visitHour(visitStart)} à ${visitHour(visitEnd)}`;
  return Promise.all([
    deliver(school?.contact_email, (mail) => mail.schoolVisit({ code: school.label_code, day, slot, site: site.name })),
    deliver(site?.contact_email, (mail) => mail.siteVisit({ code: site.label_code, day, slot, school: school.name, headcount })),
  ]);
}

/* Rappel d'une visite. */
function visitReminder({ organization, visitDay, visitSlot, place }) {
  return deliver(organization.contact_email, (mail) => mail.visitReminder({
    code: organization.label_code,
    day: visitDay || '-',
    slot: visitSlot || '-',
    place: place || organization.name,
  }));
}

module.exports = {
  participationReceived,
  participationWaitlisted,
  participationApproved,
  participationRejected,
  labelReceived,
  labelApproved,
  labelRejected,
  labelReminder,
  businessReceived,
  businessApproved,
  businessRejected,
  businessMeeting,
  visitScheduled,
  visitReminder,
};
