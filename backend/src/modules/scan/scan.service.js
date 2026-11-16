'use strict';

const { Op } = require('sequelize');
const { Organization, Participation, Passport, DeparturePoint, DepartureScan } = require('../../models');
const ApiError = require('../../utils/ApiError');
const trackingService = require('../tracking/tracking.service');
const participationService = require('../participations/participation.service');
const palais = require('../participations/palais');

/* Point de départ tel que l'écran de scan et les paramètres le voient. */
function pointView(row) {
  return { id: row.id, name: row.name, organization_id: row.organization_id || null, is_school: Boolean(row.organization_id) };
}

/* Points de départ actifs, par nom. */
async function listPoints() {
  const rows = await DeparturePoint.findAll({ order: [['name', 'ASC']] });
  return rows.map(pointView);
}

/* Paramètres : les écoles labellisées (cochées ou non) et les points libres. */
async function settings() {
  const [schools, points] = await Promise.all([
    Organization.findAll({
      where: { type: 'ecole', label_status: 'approved', is_active: true },
      attributes: ['id', 'name', 'city'],
      order: [['name', 'ASC']],
    }),
    DeparturePoint.findAll({ order: [['name', 'ASC']] }),
  ]);
  const checked = new Map(points.filter((p) => p.organization_id).map((p) => [p.organization_id, p.id]));
  return {
    schools: schools.map((s) => ({ id: s.id, name: s.name, city: s.city || null, point_id: checked.get(s.id) || null })),
    custom: points.filter((p) => !p.organization_id).map(pointView),
  };
}

/* Coche ou décoche une école comme point de départ. */
async function setSchool(organizationId, enabled) {
  const school = await Organization.findOne({ where: { id: organizationId, type: 'ecole' } });
  if (!school) throw ApiError.notFound('École introuvable');
  const existing = await DeparturePoint.findOne({ where: { organization_id: school.id } });
  if (enabled && !existing) await DeparturePoint.create({ name: school.name, organization_id: school.id });
  if (!enabled && existing) await existing.destroy();
  return settings();
}

/* Ajoute un point de départ qui n'est pas une école. */
async function addCustom(name) {
  const clean = String(name || '').trim();
  if (clean.length < 2) throw ApiError.badRequest('Indiquez le nom du point de départ');
  await DeparturePoint.create({ name: clean });
  return settings();
}

/* Retire un point de départ libre (les scans déjà faits gardent le nom du point). */
async function removeCustom(id) {
  const row = await DeparturePoint.findOne({ where: { id, organization_id: null } });
  if (!row) throw ApiError.notFound('Point de départ introuvable');
  await row.destroy();
  return settings();
}

/* Inscriptions scannables aux points de départ : particuliers seulement (les médias ne vont pas aux visites). */
const DEPARTURE_KINDS = ['particulier' /* , 'media' */];

/* Ce que le scanneur voit d'un particulier ou d'un média. */
function personView(row, code) {
  return { code: row.tracking_code || code, name: row.name, status: row.status, kind: row.kind };
}

/* Scan d'un particulier ou d'un média à un point de départ : un seul scan par inscription. */
async function scanDeparture({ code: rawCode, point_id: pointId, check = false }, user) {
  const code = trackingService.normalizeCode(rawCode);
  if (/^(?:EC|JP|AF|IN|MD)-[A-Z0-9]{4}$/.test(code)) {
    throw ApiError.badRequest('Ce QR n’est pas celui d’un particulier (PA-…) inscrit aux visites');
  }
  const point = await DeparturePoint.findByPk(pointId);
  if (!point) throw ApiError.notFound('Point de départ introuvable : revoyez les réglages du scan');
  /* Le QR porte le code du passeport, identique au code de suivi (PA-, MD-) ; les anciens passeports sont aussi reconnus. */
  let row = await Participation.findOne({ where: { kind: DEPARTURE_KINDS, tracking_code: code } });
  if (!row) {
    const passport = await Passport.findOne({ where: { code }, attributes: ['id'] });
    if (passport) row = await Participation.findOne({ where: { kind: DEPARTURE_KINDS, passport_id: passport.id } });
  }
  if (!row) throw ApiError.notFound('Aucun particulier ne correspond à ce code');
  if (row.status !== 'approved') {
    throw ApiError.conflict(`Inscription ${row.status === 'rejected' ? 'refusée' : 'pas encore validée'} : départ non enregistré`);
  }
  const existing = await DepartureScan.findOne({ where: { participation_id: row.id } });
  if (existing) {
    return { ...personView(row, code), already: true, point: existing.point_name, scanned_at: existing.scanned_at, id: row.id };
  }
  /* Vérification seule : la personne est valide, rien n'est enregistré avant « Entrer ». */
  if (check) return { ...personView(row, code), already: false, checked: true, point: point.name, scanned_at: null, id: row.id };
  const scan = await DepartureScan.create({
    participation_id: row.id,
    departure_point_id: point.id,
    point_name: point.name,
    scanned_by: user?.id || null,
  });
  return { ...personView(row, code), already: false, point: scan.point_name, scanned_at: scan.scanned_at, id: row.id };
}

/* Entrée au Palais pour le jour réglé dans le scan. Vérification de la date du jour désactivée. */
async function scanPalais({ code, day, check = false }) {
  /* const today = palais.todayDay();
  if (today === null) throw ApiError.badRequest('Aucune journée du Palais n’a lieu aujourd’hui');
  if (Number(day) !== today) {
    throw ApiError.badRequest(`Le scan est réglé sur le ${day} novembre, mais nous sommes le ${today} : revoyez les réglages`);
  } */
  return participationService.palaisCheckin(code, Number(day), { check });
}

/* Personne sans son QR : on retrouve son code par son numéro ou son e-mail (inscription au Palais, ou particulier aux visites). */
async function findByContact({ mode, query }) {
  const value = String(query || '').trim();
  const kinds = mode === 'palais' ? ['palais'] : DEPARTURE_KINDS;
  let rows = [];
  if (value.includes('@')) {
    rows = await Participation.findAll({ where: { kind: kinds, email: { [Op.iLike]: value } }, order: [['created_at', 'DESC']] });
  } else {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length < 8) throw ApiError.badRequest('Entrez un numéro de téléphone (8 chiffres au moins) ou une adresse e-mail.');
    const last8 = digits.slice(-8);
    rows = (await Participation.findAll({ where: { kind: kinds, phone: { [Op.like]: `%${last8}` } }, order: [['created_at', 'DESC']] }))
      .filter((row) => String(row.phone || '').replace(/[^0-9]/g, '').endsWith(last8));
  }
  if (!rows.length) {
    throw ApiError.notFound(mode === 'palais'
      ? 'Aucune inscription au Palais avec ce numéro ou cet e-mail'
      : 'Aucun particulier inscrit aux visites avec ce numéro ou cet e-mail');
  }
  /* Une inscription acceptée passe avant une autre (en attente, refusée). */
  const row = rows.find((r) => r.status === 'approved') || rows[0];
  let code = row.tracking_code;
  if (row.passport_id) {
    const passport = await Passport.findByPk(row.passport_id, { attributes: ['code'] });
    code = passport?.code || code;
  }
  if (!code) throw ApiError.notFound('Cette inscription n’a pas de code');
  return { code, name: row.name, status: row.status };
}

module.exports = { listPoints, settings, setSchool, addCustom, removeCustom, scanDeparture, scanPalais, findByContact };
