'use strict';

const { Op, fn, col } = require('sequelize');
const {
  Participation,
  LabelRequest,
  Organization,
  VisitBooking,
  PassportVisit,
  SurveyResponse,
  GameResult,
  WhatsappMessage,
} = require('../../models');
const palais = require('../participations/palais');

const KINDS = ['palais', 'particulier', 'ecole', 'media'];
const DAYS_BACK = 14;
/* Tampon posé à l'arrangement d'une visite : pas un passage réel. */
const ARRANGEMENT_STAMP = 'arrangement orga';

/* Compteur vide par statut. */
const emptyStatus = () => ({ total: 0, pending: 0, approved: 0, rejected: 0 });

/* Jour ISO (AAAA-MM-JJ) à l'heure de Lomé (UTC). */
function isoDay(value) {
  return new Date(value).toISOString().slice(0, 10);
}

/* Inscriptions par formulaire et par statut, avec la liste d'attente des particuliers et l'effectif des écoles. */
async function participationsBlock() {
  const rows = await Participation.findAll({
    attributes: ['kind', 'status', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('headcount')), 'headcount']],
    group: ['kind', 'status'],
    raw: true,
  });
  const byKind = Object.fromEntries(KINDS.map((k) => [k, emptyStatus()]));
  let schoolHeadcount = 0;
  for (const row of rows) {
    const bucket = byKind[row.kind];
    if (!bucket) continue;
    const count = Number(row.count) || 0;
    bucket.total += count;
    if (row.status in bucket) bucket[row.status] += count;
    if (row.kind === 'ecole' && row.status !== 'rejected') schoolHeadcount += Number(row.headcount) || 0;
  }
  const participationService = require('../participations/participation.service');
  const waitlist = await participationService.waitlistSize();
  byKind.particulier.waitlist = waitlist;
  byKind.ecole.headcount = schoolHeadcount;
  return byKind;
}

/* Journées du Palais : inscrits (hors refus), acceptés et entrées enregistrées, jour par jour. */
async function palaisBlock() {
  const rows = await Participation.findAll({
    where: { kind: 'palais', status: { [Op.ne]: 'rejected' } },
    attributes: ['status', 'palais_days', 'palais_checkins'],
    raw: true,
  });
  return palais.PALAIS_DAYS.map((day) => {
    const forDay = rows.filter((r) => palais.normalizeDays(r.palais_days).includes(day.n));
    return {
      n: day.n,
      label: day.label,
      title: day.title,
      registered: forDay.length,
      approved: forDay.filter((r) => r.status === 'approved').length,
      entries: forDay.filter((r) => r.palais_checkins && r.palais_checkins[day.n]).length,
    };
  });
}

/* Labels : demandes par statut et structures labellisées par type. */
async function labelsBlock() {
  const [requests, orgs, onMap] = await Promise.all([
    LabelRequest.findAll({
      attributes: ['status', 'structure_type', [fn('COUNT', col('id')), 'count']],
      group: ['status', 'structure_type'],
      raw: true,
    }),
    Organization.findAll({
      where: { label_status: 'approved', is_active: true },
      attributes: ['type', [fn('COUNT', col('id')), 'count']],
      group: ['type'],
      raw: true,
    }),
    Organization.count({
      where: { label_status: 'approved', is_active: true, lat: { [Op.ne]: null }, lng: { [Op.ne]: null } },
    }),
  ]);
  const req = emptyStatus();
  for (const row of requests) {
    const count = Number(row.count) || 0;
    req.total += count;
    if (row.status in req) req[row.status] += count;
  }
  const labeled = { industries: 0, schools: 0 };
  for (const row of orgs) {
    if (row.type === 'entreprise') labeled.industries = Number(row.count) || 0;
    if (row.type === 'ecole') labeled.schools = Number(row.count) || 0;
  }
  return { requests: req, labeled, on_map: onMap };
}

/* Visites d'usines planifiées et passages réels scannés. */
async function visitsBlock() {
  const [booked, headcount, passages] = await Promise.all([
    VisitBooking.count({ where: { status: { [Op.in]: ['pending', 'confirmed'] } } }),
    VisitBooking.sum('headcount', { where: { status: { [Op.in]: ['pending', 'confirmed'] } } }),
    PassportVisit.count({ where: { [Op.or]: [{ scanned_by: null }, { scanned_by: { [Op.ne]: ARRANGEMENT_STAMP } }] } }),
  ]);
  return { booked, headcount: Number(headcount) || 0, passages };
}

/* Engagement : questionnaire, quiz et conversations WhatsApp. */
async function engagementBlock() {
  const [before, after, quiz, waContacts, waIn] = await Promise.all([
    SurveyResponse.count({ where: { phase: 'before' } }),
    SurveyResponse.count({ where: { phase: 'after' } }),
    GameResult.count({ where: { game: 'quiz' } }),
    WhatsappMessage.count({ distinct: true, col: 'phone' }),
    WhatsappMessage.count({ where: { direction: 'in' } }),
  ]);
  return { survey: { before, after, total: before + after }, quiz_played: quiz, whatsapp: { contacts: waContacts, messages_in: waIn } };
}

/* Inscriptions reçues par jour sur les 14 derniers jours (tous formulaires et demandes de label). */
async function dailyBlock() {
  const since = new Date(Date.now() - (DAYS_BACK - 1) * 24 * 3600 * 1000);
  since.setUTCHours(0, 0, 0, 0);
  const [parts, labels] = await Promise.all([
    Participation.findAll({ where: { created_at: { [Op.gte]: since } }, attributes: ['created_at'], raw: true }),
    LabelRequest.findAll({ where: { created_at: { [Op.gte]: since } }, attributes: ['created_at'], raw: true }),
  ]);
  const counts = new Map();
  for (const row of [...parts, ...labels]) {
    const day = isoDay(row.created_at || row.createdAt);
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  return Array.from({ length: DAYS_BACK }, (_, i) => {
    const day = isoDay(since.getTime() + i * 24 * 3600 * 1000);
    return { date: day, count: counts.get(day) || 0 };
  });
}

/* Vue d'ensemble du tableau de bord orga. */
async function getOverview() {
  const [participations, palaisDays, labels, visits, engagement, daily] = await Promise.all([
    participationsBlock(),
    palaisBlock(),
    labelsBlock(),
    visitsBlock(),
    engagementBlock(),
    dailyBlock(),
  ]);
  const toProcess = KINDS.reduce((sum, k) => sum + participations[k].pending, 0) + labels.requests.pending;
  return { to_process: toProcess, participations, palais_days: palaisDays, labels, visits, engagement, daily };
}

module.exports = { getOverview };
