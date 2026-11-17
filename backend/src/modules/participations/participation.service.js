'use strict';

const { Op } = require('sequelize');
const { Participation, Passport, DepartureScan, WhatsappMessage, AuditEvent } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const passportService = require('../passports/passport.service');
const trackingService = require('../tracking/tracking.service');
const mailService = require('../notifications/mail.service');
const logger = require('../../utils/logger');
const { renderQrCardDataUrl } = require('../../utils/qrCard');
const { assertAvailable, duplicateError } = require('../../utils/uniqueContact');
const palais = require('./palais');
const media = require('./media');

const KINDS = ['ecole', 'particulier', 'palais', 'media'];

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
  if ('palais_days' in payload) data.palais_days = palais.normalizeDays(payload.palais_days);
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

/* Nombre de particuliers en liste d'attente (en attente de validation, au-delà des places). */
async function waitlistSize() {
  const rows = await Participation.findAll({
    where: ACTIVE_PARTICULIERS,
    attributes: ['id', 'status'],
    order: [['created_at', 'ASC'], ['id', 'ASC']],
  });
  return rows.slice(env.PARTICULIER_LIMIT).filter((row) => row.status === 'pending').length;
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
  /* Particuliers et médias : point de départ et heure du scan, s'ils ont été scannés. */
  const particulierIds = rows.filter((row) => row.kind === 'particulier' || row.kind === 'media').map((row) => row.id);
  const scans = particulierIds.length
    ? await DepartureScan.findAll({ where: { participation_id: particulierIds }, attributes: ['participation_id', 'point_name', 'scanned_at'] })
    : [];
  const scanOf = new Map(scans.map((scan) => [scan.participation_id, { point: scan.point_name, scanned_at: scan.scanned_at }]));
  const qrSent = await whatsappQrSent();
  const mailState = await approvedMailState(rows.filter((row) => row.status === 'approved').map((row) => row.id));
  return Promise.all(rows.map(async (row) => {
    const presented = await present(row);
    return {
      ...presented,
      waitlisted: row.status === 'pending' && waitlist.has(row.id),
      departure_scan: scanOf.get(row.id) || null,
      /* Vrai si la personne a reçu son QR sur WhatsApp (modèle avec QR ou carte envoyée par le bot). */
      whatsapp_qr: row.status === 'approved' && qrSent(row.phone, presented.passport?.code || row.tracking_code),
      /* E-mail d'acceptation : true envoyé, false échec, null inconnu (avant ce suivi ou sans e-mail). */
      approved_mail: mailState.has(row.id) ? mailState.get(row.id) : null,
    };
  }));
}

/* E-mail d'acceptation : envoyé ou refusé, noté dans le journal d'audit (colonne « Mail » du backoffice). */
const MAIL_ACTIONS = { sent: 'approved_mail_sent', failed: 'approved_mail_failed' };

async function recordApprovedMail(row, sent) {
  /* Sans adresse, ou envois coupés (SEND_ENABLED=false) : rien à noter. */
  if (!row?.email || sent?.reason === 'no_email' || sent?.reason === 'disabled') return;
  await AuditEvent.create({
    action: sent?.ok ? MAIL_ACTIONS.sent : MAIL_ACTIONS.failed,
    entity_type: 'participation',
    entity_id: row.id,
    summary: `E-mail d'acceptation ${sent?.ok ? 'envoyé' : 'non envoyé'} : ${row.name}`,
    meta: sent?.ok ? null : { reason: String(sent?.reason || '').split('\n')[0].slice(0, 300) },
  });
}

/* Dernier état de l'e-mail d'acceptation par participation : true (envoyé), false (échec). */
async function approvedMailState(ids) {
  if (!ids.length) return new Map();
  const events = await AuditEvent.findAll({
    where: { entity_type: 'participation', entity_id: ids, action: Object.values(MAIL_ACTIONS) },
    attributes: ['entity_id', 'action'],
    order: [['created_at', 'ASC']],
    raw: true,
  });
  const state = new Map();
  /* Un envoi réussi l'emporte : un échec plus ancien ou plus récent ne l'efface pas. */
  for (const event of events) {
    if (state.get(event.entity_id) === true) continue;
    state.set(event.entity_id, event.action === MAIL_ACTIONS.sent);
  }
  return state;
}

/* Numéro au format WhatsApp (228 + 8 chiffres pour le Togo). */
function waNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 8 ? `228${digits}` : digits;
}

/* QR reçus sur WhatsApp : modèle d'acceptation avec QR (si26_…_qr) ou carte QR envoyée par le bot. */
async function whatsappQrSent() {
  const rows = await WhatsappMessage.findAll({
    where: {
      direction: 'out',
      [Op.or]: [
        { body: { [Op.like]: 'Modèle si26%qr :%' } },
        { body: 'Modèle si26_particulier_valide_groupe' },
        { body: { [Op.like]: '[Image]%' } },
      ],
    },
    attributes: ['phone', 'body'],
    raw: true,
  });
  const templatePhones = new Set();
  const images = new Set();
  for (const row of rows) {
    if (row.body.startsWith('Modèle ')) templatePhones.add(row.phone);
    else images.add(`${row.phone}|${row.body}`);
  }
  return (phone, code) => {
    const wa = waNumber(phone);
    if (!wa) return false;
    if (templatePhones.has(wa)) return true;
    return Boolean(code) && [...images].some((key) => key.startsWith(`${wa}|`) && key.includes(code));
  };
}

/* Fiche d'une participation, avec le QR s'il existe. */
async function getById(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  return { ...(await present(row, { withImage: true })), waitlisted: await isWaitlisted(row) };
}

/* Crée une participation en attente (école / centre / université, particulier, ou particulier au Palais). */
async function create(payload) {
  const kind = KINDS.includes(payload.kind) ? payload.kind : 'ecole';
  const fields = pickFields(payload);
  if (kind !== 'palais') delete fields.palais_days;
  else if (!fields.palais_days?.length) throw ApiError.badRequest('Choisissez au moins une journée');
  if (kind === 'media') {
    fields.media_details = media.pickDetails(payload);
    if (fields.media_details.outlet.length < 2) throw ApiError.badRequest('Indiquez le nom du média, de la chaîne ou du compte');
  }
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
  if (row.kind !== 'palais') delete fields.palais_days;
  else if (fields.palais_days && !fields.palais_days.length) throw ApiError.badRequest('Choisissez au moins une journée');
  if (row.kind === 'media' && ('media_outlet' in payload || 'media_profile' in payload || 'media_link' in payload)) {
    const current = row.media_details || {};
    const next = media.pickDetails({
      media_outlet: 'media_outlet' in payload ? payload.media_outlet : current.outlet,
      media_profile: 'media_profile' in payload ? payload.media_profile : current.profile,
      media_link: 'media_link' in payload ? payload.media_link : current.link,
    });
    if (next.outlet.length < 2) throw ApiError.badRequest('Indiquez le nom du média, de la chaîne ou du compte');
    fields.media_details = next;
  }
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
    mailService.participationApproved(row, presented.passport.code)
      .then((sent) => recordApprovedMail(row, sent))
      .catch((err) => logger.warn('[participation] suivi e-mail non noté', err.message));
    try {
      const whatsappService = require('../whatsapp/whatsapp.service');
      await whatsappService.notifyParticipationApproved(presented);
    } catch (err) {
      logger.warn('[participation] notify WhatsApp failed', err.message);
    }
  }
  return present(row, { withImage: true });
}

/* Renvoie le message WhatsApp d'acceptation (modèle avec QR pour le Palais) à une participation déjà acceptée. */
async function notifyApproved(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  if (row.status !== 'approved') throw ApiError.conflict('Participation pas encore acceptée');
  const presented = await present(row, { withImage: false });
  if (!presented.passport?.code) throw ApiError.conflict('QR introuvable pour cette participation');
  const whatsappService = require('../whatsapp/whatsapp.service');
  const sent = await whatsappService.notifyParticipationApproved(presented);
  if (!sent?.ok) {
    const meta = sent?.data?.error;
    const detail = meta ? `${meta.message || 'refus'}${meta.code ? ` (code ${meta.code})` : ''}` : (sent?.reason || 'envoi refusé');
    throw ApiError.badRequest(`WhatsApp : ${detail}`);
  }
  return { id: row.id, name: row.name, status: row.status, kind: row.kind };
}

/* Renvoie l'e-mail d'acceptation (avec la mention « si déjà reçu, n'en tenez pas compte ») ; le résultat est noté. */
async function mailApproved(id) {
  const row = await Participation.findByPk(id);
  if (!row) throw ApiError.notFound('Participation introuvable');
  if (row.status !== 'approved') throw ApiError.conflict('Participation pas encore acceptée');
  if (!row.email) throw ApiError.badRequest('Pas d’adresse e-mail');
  const presented = await present(row, { withImage: false });
  if (!presented.passport?.code) throw ApiError.conflict('QR introuvable pour cette participation');
  const sent = await mailService.participationApproved(row, presented.passport.code, { resend: true });
  await recordApprovedMail(row, sent);
  if (!sent?.ok) throw ApiError.badRequest(`E-mail : ${String(sent?.reason || 'envoi refusé').split('\n')[0]}`);
  return { id: row.id, name: row.name };
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

/* Inscription au Palais retrouvée par son code (QR ou saisie). */
async function findPalaisByCode(rawCode) {
  const code = trackingService.normalizeCode(rawCode);
  const row = code ? await Participation.findOne({ where: { kind: 'palais', tracking_code: code } }) : null;
  if (!row) throw ApiError.notFound('Aucune inscription au Palais des Congrès ne correspond à ce code');
  return row;
}

/* Ce que l'accueil voit au scan : la personne, ses journées, et si elle est attendue aujourd'hui. */
function palaisView(row, day = null) {
  const days = palais.normalizeDays(row.palais_days);
  const checkins = row.palais_checkins || {};
  /* Jour réglé dans le scan, sinon la journée du Palais d'aujourd'hui. */
  const today = day ?? palais.todayDay();
  return {
    code: row.tracking_code,
    name: row.name,
    status: row.status,
    today,
    expected_today: today !== null && days.includes(today),
    checked_in_today: today !== null && Boolean(checkins[today]),
    days: palais.PALAIS_DAYS.map((day) => ({
      n: day.n,
      label: day.label,
      title: day.title,
      place: day.place,
      hours: day.hours,
      registered: days.includes(day.n),
      checked_in_at: checkins[day.n] || null,
    })),
  };
}

/* Fiche publique d'une inscription au Palais, ouverte par le QR. */
async function palaisPass(code) {
  return palaisView(await findPalaisByCode(code));
}

/* Enregistre l'entrée du jour au Palais (accueil connecté). */
async function palaisCheckin(code, day = null, { check = false } = {}) {
  const row = await findPalaisByCode(code);
  if (row.status !== 'approved') throw ApiError.conflict('Inscription pas encore validée : entrée non enregistrée');
  /* Jour réglé dans le scan ; sans réglage, la journée du Palais d'aujourd'hui. */
  const today = palais.DAY_NUMBERS.includes(Number(day)) ? Number(day) : palais.todayDay();
  if (today === null) throw ApiError.badRequest('Aucune journée du Palais n’a lieu aujourd’hui');
  /* Vérification des journées cochées désactivée : seule règle, une entrée par jour.
  if (!palais.normalizeDays(row.palais_days).includes(today)) {
    throw ApiError.conflict(`Inscrit pour : ${palais.daysShort(row.palais_days)}. Pas pour le ${today} novembre.`);
  } */
  const checkins = { ...(row.palais_checkins || {}) };
  /* Une seule entrée par jour calendaire à Lomé, quel que soit le jour réglé sur l'appareil qui scanne. */
  const lomeDate = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lome' }).format(new Date(value));
  const now = new Date();
  const alreadyAt = Object.values(checkins).find((at) => at && lomeDate(at) === lomeDate(now)) || null;
  const already = Boolean(alreadyAt);
  /* Vérification seule : la personne est valide, rien n'est enregistré avant « Entrer ». */
  if (check) return { ...palaisView(row, today), already, already_at: alreadyAt, checked: !already, id: row.id };
  if (!already) {
    checkins[today] = now.toISOString();
    row.palais_checkins = checkins;
    await row.save();
  }
  return { ...palaisView(row, today), already, already_at: alreadyAt, id: row.id };
}

/* Fiche publique d'une accréditation média, ouverte par le QR (accueil du Palais). */
async function mediaPass(rawCode) {
  const code = trackingService.normalizeCode(rawCode);
  const row = code ? await Participation.findOne({ where: { kind: 'media', tracking_code: code } }) : null;
  if (!row) throw ApiError.notFound('Aucune accréditation média ne correspond à ce code');
  const details = row.media_details || {};
  return {
    code: row.tracking_code,
    name: row.name,
    status: row.status,
    outlet: details.outlet || null,
    profile: media.profileLabel(details.profile),
    validity: media.MEDIA_VALIDITY,
  };
}

module.exports = {
  waitlistSize,
  mediaPass,
  palaisPass,
  palaisCheckin,
  isWaitlisted,
  particulierCapacity,
  list,
  getById,
  create,
  update,
  approve,
  notifyApproved,
  recordApprovedMail,
  mailApproved,
  reject,
  remove,
};
