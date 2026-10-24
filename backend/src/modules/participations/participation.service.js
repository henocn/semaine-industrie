'use strict';

const { Participation, Passport } = require('../../models');
const ApiError = require('../../utils/ApiError');
const passportService = require('../passports/passport.service');
const logger = require('../../utils/logger');

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
  if ('headcount' in payload) data.headcount = payload.headcount || null;
  return data;
}

/* Ajoute le passeport (QR seulement sur la fiche, pas dans la liste). */
async function present(row, { withImage = false } = {}) {
  const json = row.toJSON();
  if (!row.passport_id) return { ...json, passport: null };
  const passport = await Passport.findByPk(row.passport_id);
  if (!passport) return { ...json, passport: null };
  if (!withImage) {
    return { ...json, passport: { id: passport.id, code: passport.code, passed_at: passport.passed_at || null } };
  }
  return { ...json, passport: await passportService.withQr(passport) };
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
  return Promise.all(rows.map((row) => present(row)));
}

/* Fiche d'une participation, avec le QR s'il existe. */
async function getById(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  return present(row, { withImage: true });
}

/* Crée une participation en attente. */
async function create(payload) {
  const row = await Participation.create({
    kind: payload.kind,
    status: 'pending',
    ...pickFields(payload),
  });
  return present(row);
}

/* Met à jour les informations. */
async function update(id, payload) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  await row.update(pickFields(payload));
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
    })
    : await passportService.createIndividual({ holder_name: row.name });
  row.passport_id = passport.id;
  return passport;
}

/* Accepte et crée le QR du jour J (groupe pour une école, individuel sinon). */
async function approve(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');

  const wasApproved = row.status === 'approved';
  await ensurePassport(row);
  row.status = 'approved';
  await row.save();

  if (!wasApproved) {
    const presented = await present(row, { withImage: false });
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
  row.status = 'rejected';
  await row.save();
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
  list,
  getById,
  create,
  update,
  approve,
  reject,
  remove,
};
