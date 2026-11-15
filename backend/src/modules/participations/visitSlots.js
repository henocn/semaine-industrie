'use strict';

const { Op } = require('sequelize');
const { sequelize, Participation } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const trackingService = require('../tracking/tracking.service');

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
  const match = text.match(/([A-Z]{2})-?([A-Z0-9]{4})/);
  return match ? `${match[1]}-${match[2]}` : text;
}

/* Inscription d'un particulier validé, ou une erreur claire. */
async function findBookable(rawCode, transaction) {
  const code = readCode(rawCode);
  const row = code
    ? await Participation.findOne({
      where: { tracking_code: code },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    })
    : null;
  if (!row) throw ApiError.notFound('Code introuvable. Vérifiez-le et réessayez.');
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
    code: row.tracking_code,
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
    attributes: ['id', 'name', 'phone', 'email', 'tracking_code', 'visit_slot', 'visit_slot_at'],
    order: [['visit_slot_at', 'ASC']],
  });
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
          code: row.tracking_code,
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
