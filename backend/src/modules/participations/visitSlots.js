'use strict';

const { Op } = require('sequelize');
const { sequelize, Participation, Passport } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const trackingService = require('../tracking/tracking.service');

/* Groupe WhatsApp des visites des particuliers (heures, entreprises visitées, consignes). */
const WHATSAPP_GROUP = 'https://chat.whatsapp.com/D23e7tkuv5E77DmwnSnQxx';

/* Places par départ (une demi-journée et un lieu de rencontre). */
const CAPACITY = 50;

const PLACES = {
  agoe: 'Lycée d’Agoé',
  palais: 'Palais des Congrès de Lomé',
};

const DAYS = {
  19: 'Jeudi 19 novembre',
  20: 'Vendredi 20 novembre',
};

const PERIODS = {
  matin: 'Matin',
  'apres-midi': 'Après-midi',
};

/* Les 8 départs des particuliers : 2 jours, 2 demi-journées, 2 lieux. */
const SLOTS = Object.keys(DAYS).flatMap((day) =>
  Object.keys(PERIODS).flatMap((period) =>
    Object.keys(PLACES).map((place) => ({
      id: `${day}-${period}-${place}`,
      day: DAYS[day],
      period: PERIODS[period],
      place: PLACES[place],
    })),
  ),
);

/* Fiche d'un départ par son identifiant. */
function slotInfo(id) {
  return SLOTS.find((slot) => slot.id === id) || null;
}

/* Départ en une ligne : « Jeudi 19 novembre, matin, Lycée d’Agoé ». */
function slotLabel(id) {
  const slot = slotInfo(id);
  return slot ? `${slot.day}, ${slot.period.toLowerCase()}, ${slot.place}` : '';
}

/* Seuls les particuliers validés gardent une place. */
const BOOKED = {
  kind: 'particulier',
  status: 'approved',
  visit_slot: { [Op.ne]: null },
};

/* Nombre de réservations par départ. */
async function countBySlot(transaction) {
  const rows = await Participation.findAll({
    where: BOOKED,
    attributes: ['visit_slot', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
    group: ['visit_slot'],
    raw: true,
    transaction,
  });
  return new Map(rows.map((row) => [row.visit_slot, Number(row.n)]));
}

/* Départs avec les places restantes (page publique). */
async function availability() {
  const counts = await countBySlot();
  return {
    open: env.VISIT_SLOTS_OPEN,
    slots: SLOTS.map((slot) => {
      const booked = counts.get(slot.id) || 0;
      return { ...slot, capacity: CAPACITY, remaining: Math.max(CAPACITY - booked, 0) };
    }),
  };
}

/* Code de suivi saisi ou lu dans un QR : « pa7rqa », « PA-7RQA », un lien qui le contient. */
function readCode(raw) {
  const text = trackingService.normalizeCode(raw);
  if (trackingService.isKnownCodeShape(text)) return text;
  /* Lien du QR : « …/passage/PA-7RQA ». */
  const fromLink = text.match(/\/PASSAGE\/([A-Z0-9-]+)/);
  if (fromLink) return fromLink[1];
  const match = text.match(/\b(PA|JP|EC|MD|IN|AF)-?([A-Z0-9]{4})\b/);
  return match ? `${match[1]}-${match[2]}` : text;
}

/* Inscription par son code de suivi, ou par le code de son passeport (celui du QR et du backoffice). */
async function findByCode(code, transaction) {
  if (!code) return null;
  const lock = transaction ? transaction.LOCK.UPDATE : undefined;
  const row = await Participation.findOne({ where: { tracking_code: code }, transaction, lock });
  if (row) return row;
  const passport = await Passport.findOne({ where: { code }, attributes: ['id'], transaction });
  return passport ? Participation.findOne({ where: { passport_id: passport.id }, transaction, lock }) : null;
}

/* Inscription d'un particulier validé, ou une erreur claire. */
async function findBookable(rawCode, transaction) {
  const code = readCode(rawCode);
  const row = await findByCode(code, transaction);
  if (!row) throw ApiError.notFound('Code introuvable. Vérifiez-le et réessayez.');
  /* Code affiché à la personne : celui qu'elle a saisi ou scanné. */
  row.displayCode = row.tracking_code || code;
  if (row.kind !== 'particulier') {
    throw ApiError.badRequest('Ce code n’est pas celui d’une inscription aux visites des particuliers.');
  }
  if (row.status === 'rejected') throw ApiError.conflict('Cette inscription n’a pas été retenue.');
  if (row.status !== 'approved') {
    throw ApiError.conflict('Votre inscription n’est pas encore validée. Vous pourrez réserver dès sa validation.');
  }
  return row;
}

/* Ce que la personne voit : prénom et nom, et son départ s'il est déjà choisi. */
function view(row) {
  return {
    code: row.displayCode || row.tracking_code,
    name: row.name,
    slot: row.visit_slot ? slotInfo(row.visit_slot) : null,
  };
}

/* Vérifie le code avant le choix du départ (page publique). */
async function lookup(rawCode) {
  return view(await findBookable(rawCode));
}

/* Réserve un départ : une seule réservation par inscription, 50 places par départ. */
async function book(rawCode, slotId) {
  if (!env.VISIT_SLOTS_OPEN) throw ApiError.conflict('Les réservations ne sont pas ouvertes.');
  const slot = slotInfo(slotId);
  if (!slot) throw ApiError.badRequest('Choisissez un départ.');

  return sequelize.transaction(async (transaction) => {
    const row = await findBookable(rawCode, transaction);
    if (row.visit_slot) return { ...view(row), id: row.id, already: true };

    /* Un verrou par départ : deux personnes ne prennent pas la dernière place en même temps. */
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
      replacements: { key: `visit-slot:${slot.id}` },
      transaction,
    });
    const booked = (await countBySlot(transaction)).get(slot.id) || 0;
    if (booked >= CAPACITY) throw ApiError.conflict('Ce départ est complet. Choisissez-en un autre.');

    row.visit_slot = slot.id;
    row.visit_slot_at = new Date();
    await row.save({ transaction });
    return { ...view(row), id: row.id, already: false };
  });
}

/* Planning des départs pour le backoffice : chaque départ et ses inscrits. */
async function planning() {
  const rows = await Participation.findAll({
    where: BOOKED,
    attributes: ['id', 'name', 'phone', 'email', 'tracking_code', 'passport_id', 'visit_slot', 'visit_slot_at'],
    order: [['visit_slot_at', 'ASC']],
  });
  /* Inscriptions sans code de suivi : on montre le code de leur passeport, comme dans la liste des participations. */
  const passportIds = rows.filter((row) => !row.tracking_code && row.passport_id).map((row) => row.passport_id);
  const passportCodes = new Map(
    passportIds.length
      ? (await Passport.findAll({ where: { id: passportIds }, attributes: ['id', 'code'] })).map((p) => [p.id, p.code])
      : [],
  );
  const waiting = await Participation.count({
    where: { kind: 'particulier', status: 'approved', visit_slot: null },
  });
  return {
    open: env.VISIT_SLOTS_OPEN,
    capacity: CAPACITY,
    waiting,
    slots: SLOTS.map((slot) => ({
      ...slot,
      people: rows
        .filter((row) => row.visit_slot === slot.id)
        .map((row) => ({
          id: row.id,
          name: row.name,
          code: row.tracking_code || passportCodes.get(row.passport_id) || null,
          phone: row.phone,
          email: row.email,
          booked_at: row.visit_slot_at,
        })),
    })),
  };
}

/* Change ou libère le départ d'un particulier (backoffice). La limite de 50 reste valable. */
async function setSlot(id, slotId) {
  const slot = slotId ? slotInfo(slotId) : null;
  if (slotId && !slot) throw ApiError.badRequest('Départ inconnu.');

  return sequelize.transaction(async (transaction) => {
    const row = await Participation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row || row.kind !== 'particulier') throw ApiError.notFound('Particulier introuvable');
    const previous = row.visit_slot;
    if (slot && slot.id !== previous) {
      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
        replacements: { key: `visit-slot:${slot.id}` },
        transaction,
      });
      const booked = (await countBySlot(transaction)).get(slot.id) || 0;
      if (booked >= CAPACITY) throw ApiError.conflict('Ce départ est complet.');
    }
    row.visit_slot = slot ? slot.id : null;
    row.visit_slot_at = slot ? (slot.id === previous ? row.visit_slot_at : new Date()) : null;
    await row.save({ transaction });
    return { id: row.id, name: row.name, previous, slot: row.visit_slot };
  });
}

module.exports = {
  WHATSAPP_GROUP,
  CAPACITY,
  SLOTS,
  slotInfo,
  slotLabel,
  availability,
  lookup,
  book,
  planning,
  setSlot,
};
