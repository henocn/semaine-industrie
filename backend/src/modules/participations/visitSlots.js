'use strict';

const { Op } = require('sequelize');
const { sequelize, Participation, Passport, AuditEvent, DepartureScan } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const trackingService = require('../tracking/tracking.service');

/* Groupe WhatsApp des visites des particuliers (heures, entreprises visitées, consignes). */
const WHATSAPP_GROUP = 'https://chat.whatsapp.com/D23e7tkuv5E77DmwnSnQxx';

/*
 * Choix des créneaux ouvert ou fermé, départ par départ (8 départs) : cases des Paramètres du backoffice.
 * Chaque changement ajoute une ligne dans audit_events (qui, quand) ; la dernière ligne du départ fait foi.
 * Départ jamais réglé : réglage de son jour (ancienne case par jour), sinon VISIT_SLOTS_OPEN du .env.
 * Gardé en mémoire après la première lecture.
 */
const OPEN_ACTIONS = { true: 'visit_slots_opened', false: 'visit_slots_closed' };
const settingFor = (key) => ({ entity_type: 'setting', entity_id: `visit_slots_open_${key}` });
let openCache = null;

/* Dernier réglage enregistré pour une clé (départ ou jour) : true, false, ou null si jamais réglé. */
async function lastSetting(key) {
  const last = await AuditEvent.findOne({
    where: { ...settingFor(key), action: Object.values(OPEN_ACTIONS) },
    order: [['created_at', 'DESC']],
    attributes: ['action'],
  });
  return last ? last.action === OPEN_ACTIONS.true : null;
}

/* Jour d'un départ : « 19-matin-agoe » donne « 19 ». */
function dayOf(slotId) {
  return String(slotId).split('-')[0];
}

/* État de chaque départ : { '19-matin-agoe': true, ... }. */
async function openSlots() {
  if (openCache === null) {
    const byDay = {};
    for (const day of Object.keys(DAYS)) byDay[day] = await lastSetting(day);
    const state = {};
    for (const slot of SLOTS) {
      const own = await lastSetting(slot.id);
      const fromDay = byDay[dayOf(slot.id)];
      state[slot.id] = own ?? fromDay ?? env.VISIT_SLOTS_OPEN;
    }
    openCache = state;
  }
  return openCache;
}

/* Au moins un départ encore ouvert. */
async function isOpen() {
  return Object.values(await openSlots()).some(Boolean);
}

/* Les 8 départs avec leur état, pour les Paramètres. */
async function slotsView() {
  const state = await openSlots();
  return SLOTS.map((slot) => ({ ...slot, open: state[slot.id] }));
}

/* Jours : ouverts si au moins un de leurs départs l'est (page publique, planning). */
async function daysView() {
  const state = await openSlots();
  return Object.keys(DAYS).map((day) => ({
    day,
    label: DAYS[day],
    open: SLOTS.some((slot) => dayOf(slot.id) === day && state[slot.id]),
  }));
}

/* Ouvre ou ferme un départ depuis le backoffice, et le note. */
async function setOpen(slotId, open, user = {}) {
  const slot = SLOTS.find((s) => s.id === String(slotId));
  if (!slot) throw ApiError.badRequest('Départ inconnu.');
  const value = Boolean(open);
  await AuditEvent.create({
    ...settingFor(slot.id),
    user_id: user.id || null,
    actor_email: user.email || null,
    action: OPEN_ACTIONS[value],
    summary: `Départ ${slot.day.toLowerCase()}, ${slot.period.toLowerCase()}, ${slot.place} : choix ${value ? 'ouvert' : 'fermé'}`,
  });
  await openSlots();
  openCache = { ...openCache, [slot.id]: value };
  return { open: await isOpen(), days: await daysView(), slots: await slotsView() };
}

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
  const state = await openSlots();
  return {
    open: await isOpen(),
    days: await daysView(),
    slots: SLOTS.map((slot) => {
      const booked = counts.get(slot.id) || 0;
      return { ...slot, open: state[slot.id], capacity: CAPACITY, remaining: Math.max(CAPACITY - booked, 0) };
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
    /* Lien du groupe : donné seulement après vérification d'un code validé, jamais dans le code public du site. */
    group: WHATSAPP_GROUP,
  };
}

/* Vérifie le code avant le choix du départ (page publique). */
async function lookup(rawCode) {
  return view(await findBookable(rawCode));
}

/* Réserve un départ : une seule réservation par inscription, 50 places par départ. */
async function book(rawCode, slotId) {
  if (!(await isOpen())) throw ApiError.conflict('Le choix des créneaux est clos.');
  const slot = slotInfo(slotId);
  if (!slot) throw ApiError.badRequest('Choisissez un départ.');
  if (!(await openSlots())[slot.id]) {
    throw ApiError.conflict(`Le départ du ${slot.day.toLowerCase()}, ${slot.period.toLowerCase()}, ${slot.place} est clos. Choisissez-en un autre.`);
  }

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
  const scansOf = await departureScans(rows.map((row) => row.id));
  return {
    open: await isOpen(),
    days: await daysView(),
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
          scans: scansOf.get(row.id) || [],
        })),
    })),
  };
}

/*
 * Scans de départ par inscription, du plus ancien au plus récent :
 * le premier départ (departure_scans) puis les reprises notées dans le journal (« Départ repris à « … » »).
 */
async function departureScans(ids) {
  const byId = new Map();
  if (!ids.length) return byId;
  const push = (id, scan) => byId.set(id, [...(byId.get(id) || []), scan]);
  const first = await DepartureScan.findAll({
    where: { participation_id: ids },
    attributes: ['participation_id', 'point_name', 'scanned_at'],
  });
  for (const scan of first) push(scan.participation_id, { point: scan.point_name, at: scan.scanned_at, again: false });
  const again = await AuditEvent.findAll({
    where: { entity_type: 'participation', entity_id: ids, summary: { [Op.like]: 'Départ repris à « %' } },
    attributes: ['entity_id', 'summary', 'created_at'],
  });
  for (const event of again) {
    const point = /^Départ repris à « (.+?) »/.exec(event.summary)?.[1] || 'point inconnu';
    push(event.entity_id, { point, at: event.created_at, again: true });
  }
  for (const list of byId.values()) list.sort((a, b) => new Date(a.at) - new Date(b.at));
  return byId;
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
  isOpen,
  setOpen,
};
