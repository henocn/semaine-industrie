'use strict';

const { Op } = require('sequelize');
const { Participation, Passport } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const passportService = require('../passports/passport.service');
const trackingService = require('../tracking/tracking.service');
const mailService = require('../notifications/mail.service');
const logger = require('../../utils/logger');
const { renderQrCardDataUrl } = require('../../utils/qrCard');
const { assertAvailable, duplicateError } = require('../../utils/uniqueContact');

/* Vide une chaîne optionnelle. */
function emptyToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

/* Prépare les champs éditables. */
function pickFields(payload) {
  const data = {};
  if (payload.name != null) data.name = String(payload.name).trim();
  if ('email' in payload) data.email = emptyToNull(payload.email);
  if ('phone' in payload) data.phone = emptyToNull(payload.phone);
  if ('description' in payload) data.description = emptyToNull(payload.description);
  if ('city' in payload) data.city = emptyToNull(payload.city);
  if ('address' in payload) data.address = emptyToNull(payload.address);
  if ('lat' in payload) data.lat = payload.lat ?? null;
  if ('lng' in payload) data.lng = payload.lng ?? null;
  if ('headcount' in payload) data.headcount = payload.headcount || null;
  return data;
}

/* Ajoute le passeport (QR seulement sur la fiche, pas dans la liste). */
async function present(row, { withImage = false } = {}) {
  const json = row.toJSON();
  if (!row.passport_id) return { ...json, passport: null };
  const passport = await Passport.findByPk(row.passport_id);
  if (!passport) return { ...json, passport: null };
  const passages = (await passportService.countPassages([passport])).get(passport.id) || 0;
  if (!withImage) {
    return {
      ...json,
      passport: { id: passport.id, code: passport.code, passed_at: passport.passed_at || null, passages },
    };
  }
  const qr_data_url = await renderQrCardDataUrl({
    payload: passportService.passageQrPayload(passport.code),
    name: row.name,
    code: passport.code,
  });
  return { ...json, passport: { ...(await passportService.withQr(passport)), qr_data_url, passages } };
}

/* Particuliers qui comptent dans les places : tous ceux qui ne sont pas refusés. */
const ACTIVE_PARTICULIERS = { kind: 'particulier', status: { [Op.ne]: 'rejected' } };

/* Particuliers au-delà des places, par ordre d'arrivée : ils sont en liste d'attente. */
async function waitlistIds() {
  const rows = await Participation.findAll({
    where: ACTIVE_PARTICULIERS,
    attributes: ['id'],
    order: [['created_at', 'ASC'], ['id', 'ASC']],
  });
  return new Set(rows.slice(env.PARTICULIER_LIMIT).map((row) => row.id));
}

/* Une inscription en attente de validation est-elle en liste d'attente ? */
async function isWaitlisted(row) {
  if (!row || row.kind !== 'particulier' || row.status !== 'pending') return false;
  return (await waitlistIds()).has(row.id);
}

/* Indique au formulaire public si les places des particuliers sont toutes prises. */
async function particulierCapacity() {
  const taken = await Participation.count({ where: ACTIVE_PARTICULIERS });
  return { full: taken >= env.PARTICULIER_LIMIT };
}

/* Liste les participations, filtrables par type et statut. */
async function list({ kind, status } = {}) {
  const where = {};
  if (kind) where.kind = kind;
  if (status) where.status = status;
  const rows = await Participation.findAll({
    where,
    order: [['created_at', 'DESC']],
  });
  const waitlist = await waitlistIds();
  return Promise.all(rows.map(async (row) => ({
    ...(await present(row)),
    waitlisted: row.status === 'pending' && waitlist.has(row.id),
  })));
}

/* Fiche d'une participation, avec le QR s'il existe. */
async function getById(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  return { ...(await present(row, { withImage: true })), waitlisted: await isWaitlisted(row) };
}

/* Crée une participation en attente (école / centre / université, ou particulier). */
async function create(payload) {
  const kind = payload.kind === 'particulier' ? 'particulier' : 'ecole';
  const fields = pickFields(payload);
  await assertAvailable('participations', { kind, email: fields.email, phone: fields.phone });
  const row = await Participation.create({
    kind,
    status: 'pending',
    tracking_code: await trackingService.nextCode(trackingService.prefixFor(kind)),
    ...fields,
  }).catch((err) => { throw duplicateError(err); });
  const waitlisted = await isWaitlisted(row);
  if (waitlisted) {
    mailService.participationWaitlisted(row);
  } else {
    mailService.participationReceived(row);
  }
  try {
    const whatsappService = require('../whatsapp/whatsapp.service');
    await (waitlisted
      ? whatsappService.notifyParticipationWaitlisted(row)
      : whatsappService.notifyParticipationReceived(row));
  } catch (err) {
    logger.warn('[participation] notify WhatsApp failed', err.message);
  }
  return { ...(await present(row)), waitlisted };
}

/* Met à jour les informations. */
async function update(id, payload) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  const fields = pickFields(payload);
  await assertAvailable('participations', {
    kind: row.kind, excludeId: row.id, email: fields.email, phone: fields.phone,
  });
  await row.update(fields).catch((err) => { throw duplicateError(err); });
  if (row.passport_id && payload.name) {
    const passport = await Passport.findByPk(row.passport_id);
    if (passport) {
      if (row.kind === 'ecole') passport.school_name = row.name;
      else passport.holder_name = row.name;
      if (payload.headcount && row.kind === 'ecole') passport.headcount = row.headcount;
      await passport.save();
    }
  }
  return present(row, { withImage: true });
}

/* Crée le passeport (code + QR) s'il manque encore. */
async function ensurePassport(row) {
  if (row.passport_id) {
    const existing = await Passport.findByPk(row.passport_id);
    if (existing) return existing;
  }
  const passport = row.kind === 'ecole'
    ? await passportService.createGroup({
      school_name: row.name,
      holder_name: row.name,
      headcount: row.headcount,
      code: row.tracking_code,
    })
    : await passportService.createIndividual({ holder_name: row.name, code: row.tracking_code });
  row.passport_id = passport.id;
  row.tracking_code = passport.code;
  return passport;
}

/* Accepte et crée le QR du jour J (groupe pour une école, individuel pour un particulier). */
async function approve(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');

  const wasApproved = row.status === 'approved';
  await ensurePassport(row);
  row.status = 'approved';
  await row.save();

  if (!wasApproved) {
    const presented = await present(row, { withImage: false });
    mailService.participationApproved(row, presented.passport.code);
    try {
      const whatsappService = require('../whatsapp/whatsapp.service');
      await whatsappService.notifyParticipationApproved(presented);
    } catch (err) {
      logger.warn('[participation] notify WhatsApp failed', err.message);
    }
  }
  return present(row, { withImage: true });
}

/* Refuse une participation. */
async function reject(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  const wasRejected = row.status === 'rejected';
  row.status = 'rejected';
  await row.save();
  if (!wasRejected) {
    mailService.participationRejected(row);
    try {
      const whatsappService = require('../whatsapp/whatsapp.service');
      await whatsappService.notifyParticipationRejected(row);
    } catch (err) {
      logger.warn('[participation] notify WhatsApp failed', err.message);
    }
  }
  return present(row);
}

/* Supprime une participation. */
async function remove(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  await row.destroy();
  return { id };
}

module.exports = {
  isWaitlisted,
  particulierCapacity,
  list,
  getById,
  create,
  update,
  approve,
  reject,
  remove,
};
