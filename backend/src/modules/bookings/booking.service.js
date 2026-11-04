'use strict';

const { Op, fn, col, where: whereFn } = require('sequelize');
const { VisitBooking, Organization, Passport, PassportVisit, Participation } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { notifyN8n } = require('../../utils/n8n');
const passportService = require('../passports/passport.service');
const mailService = require('../notifications/mail.service');

/* Effectif de l'école (fiche, sinon inscription), 0 si rien n'est renseigné. */
function schoolHeadcount(school, participation) {
  for (const value of [school?.max_visitors, participation?.headcount]) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return 0;
}

/* Inscription école acceptée portant le même nom que la fiche labellisée. */
async function findSchoolParticipation(school) {
  const name = String(school?.name || '').trim().toLowerCase();
  if (!name) return null;
  return Participation.findOne({
    where: {
      kind: 'ecole',
      status: 'approved',
      passport_id: { [Op.ne]: null },
      [Op.and]: [whereFn(fn('lower', fn('trim', col('name'))), name)],
    },
    order: [['created_at', 'ASC']],
  });
}

/* Rattache le passeport reçu à l'inscription à la fiche école ; les doublons créés à l'arrangement
   lui cèdent leurs tampons puis sont désactivés (rien n'est supprimé). */
async function linkSchoolParticipation(school) {
  const participation = await findSchoolParticipation(school);
  if (!participation) return null;
  const passport = await Passport.findOne({ where: { id: participation.passport_id, is_active: true } });
  if (!passport) return participation;
  if (!passport.school_organization_id) {
    passport.school_organization_id = school.id;
    await passport.save();
  }
  if (passport.school_organization_id !== school.id) return participation;

  const duplicates = await Passport.findAll({
    where: {
      kind: 'group',
      school_organization_id: school.id,
      class_label: null,
      is_active: true,
      id: { [Op.ne]: passport.id },
    },
  });
  for (const dup of duplicates) {
    const visits = await PassportVisit.findAll({ where: { passport_id: dup.id } });
    for (const visit of visits) {
      const taken = await PassportVisit.findOne({
        where: { passport_id: passport.id, organization_id: visit.organization_id },
      });
      if (!taken) await visit.update({ passport_id: passport.id });
    }
    if (dup.passed_at && !passport.passed_at) {
      passport.passed_at = dup.passed_at;
      await passport.save();
    }
    await dup.update({ is_active: false });
  }
  return participation;
}

/* E-mail école, vide si absent (pas de valeur fictive). */
function schoolEmail(school) {
  return String(school?.contact_email || '').trim();
}

/* Crée une ou plusieurs visites (même site / date / heures). */
async function createBooking(payload) {
  const schoolIds = uniqueSchoolIds(payload);
  if (!schoolIds.length) throw ApiError.badRequest('Choisissez au moins un établissement');
  const created = [];
  for (const schoolId of schoolIds) {
    created.push(await createSingleBooking({ ...payload, school_organization_id: schoolId }));
  }
  return created.length === 1 ? created[0] : created;
}

/* Identifiants d'écoles uniques depuis le payload. */
function uniqueSchoolIds(payload) {
  const raw = Array.isArray(payload.school_organization_ids) && payload.school_organization_ids.length
    ? payload.school_organization_ids
    : [payload.school_organization_id];
  return [...new Set(raw.map((id) => String(id || '').trim()).filter(Boolean))];
}

/* Crée un arrangement de visite (orga) à partir du site et de l'école. */
async function createSingleBooking(payload) {
  const site = await Organization.findOne({
    where: {
      id: payload.organization_id,
      type: 'entreprise',
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!site) throw ApiError.notFound('Site industriel introuvable ou non labellisé');

  const school = await Organization.findOne({
    where: {
      id: payload.school_organization_id,
      type: 'ecole',
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!school) throw ApiError.notFound('Établissement introuvable ou non labellisé');

  const headcount = schoolHeadcount(school, await linkSchoolParticipation(school));

  if (site.max_visitors) {
    const used = await VisitBooking.sum('headcount', {
      where: {
        organization_id: site.id,
        visit_day: payload.visit_day,
        visit_start: payload.visit_start,
        visit_end: payload.visit_end,
        status: { [Op.in]: ['pending', 'confirmed'] },
      },
    });
    const already = Number(used || 0);
    if (already + headcount > site.max_visitors) {
      throw ApiError.conflict(
        `Capacité dépassée (${already}/${site.max_visitors} déjà prévus pour ce créneau)`,
      );
    }
  }

  const booking = await VisitBooking.create({
    organization_id: site.id,
    school_organization_id: school.id,
    school_name: school.name,
    teacher_name: school.contact_name || school.name,
    teacher_email: schoolEmail(school),
    teacher_phone: school.contact_phone || null,
    visit_day: payload.visit_day,
    visit_start: payload.visit_start,
    visit_end: payload.visit_end,
    headcount,
    notes: payload.notes || null,
    status: 'confirmed',
  });

  await notifyN8n('booking.confirmed', {
    id: booking.id,
    school_name: booking.school_name,
    teacher_email: booking.teacher_email,
    teacher_name: booking.teacher_name,
    headcount: booking.headcount,
    visit_day: booking.visit_day,
    visit_start: booking.visit_start,
    visit_end: booking.visit_end,
    site: site.name,
  });

  mailService.visitScheduled({
    school,
    site,
    visitDay: booking.visit_day,
    visitStart: booking.visit_start,
    visitEnd: booking.visit_end,
    headcount: booking.headcount,
  });

  try {
    const wa = require('../whatsapp/whatsapp.service');
    await wa.notifyVisitScheduled({
      school,
      site,
      visitDay: booking.visit_day,
      visitStart: booking.visit_start,
      visitEnd: booking.visit_end,
      headcount: booking.headcount,
    });
  } catch {
    /* notification non bloquante */
  }

  /* Un seul passeport de groupe pour l'école : un tampon = tout le parcours commun. */
  try {
    await passportService.ensureGroupStampForBooking({
      school,
      site,
      headcount,
      scanned_by: 'arrangement orga',
    });
  } catch {
    /* La résa reste valide même si le tampon échoue. */
  }

  return getBookingById(booking.id);
}

/* Ajoute le nombre de passages du passeport groupe de l'école (0 tant qu'aucun scan). */
async function attachPassage(rows) {
  const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
  const schoolIds = [...new Set(list.map((row) => row.school_organization_id || row.school?.id).filter(Boolean))];
  const passports = schoolIds.length
    ? await Passport.findAll({
      where: { school_organization_id: schoolIds, kind: 'group', is_active: true },
      attributes: ['id', 'school_organization_id', 'passed_at'],
    })
    : [];
  const counts = await passportService.countPassages(passports);
  const bySchool = new Map();
  passports.forEach((p) => {
    bySchool.set(p.school_organization_id, (bySchool.get(p.school_organization_id) || 0) + (counts.get(p.id) || 0));
  });
  return list.map((row) => {
    const json = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
    const schoolId = json.school_organization_id || json.school?.id;
    json.passage = (schoolId && bySchool.get(schoolId)) || 0;
    /* Contact à jour depuis la fiche école (vide si non renseigné). */
    if (json.school) {
      json.teacher_email = schoolEmail(json.school);
      json.teacher_phone = json.school.contact_phone || null;
    }
    return json;
  });
}

/* Détail réservation avec site + école. */
async function getBookingById(id) {
  const row = await VisitBooking.findByPk(id, {
    include: [
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name', 'slug', 'city', 'max_visitors', 'lat', 'lng'],
      },
      {
        model: Organization,
        as: 'school',
        attributes: ['id', 'name', 'slug', 'city', 'contact_email', 'contact_phone', 'max_visitors'],
      },
    ],
  });
  if (!row) throw ApiError.notFound('Réservation introuvable');
  const [withPassage] = await attachPassage([row]);
  return withPassage;
}

/* Met à jour une visite arrangée (orga). */
async function updateBooking(id, payload) {
  const existing = await VisitBooking.findByPk(id);
  if (!existing) throw ApiError.notFound('Réservation introuvable');

  const site = await Organization.findOne({
    where: {
      id: payload.organization_id,
      type: 'entreprise',
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!site) throw ApiError.notFound('Site industriel introuvable ou non labellisé');

  const school = await Organization.findOne({
    where: {
      id: payload.school_organization_id,
      type: 'ecole',
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!school) throw ApiError.notFound('Établissement introuvable ou non labellisé');

  const headcount = schoolHeadcount(school, await linkSchoolParticipation(school));

  if (site.max_visitors) {
    const used = await VisitBooking.sum('headcount', {
      where: {
        id: { [Op.ne]: id },
        organization_id: site.id,
        visit_day: payload.visit_day,
        visit_start: payload.visit_start,
        visit_end: payload.visit_end,
        status: { [Op.in]: ['pending', 'confirmed'] },
      },
    });
    const already = Number(used || 0);
    if (already + headcount > site.max_visitors) {
      throw ApiError.conflict(
        `Capacité dépassée (${already}/${site.max_visitors} déjà prévus pour ce créneau)`,
      );
    }
  }

  await existing.update({
    organization_id: site.id,
    school_organization_id: school.id,
    school_name: school.name,
    teacher_name: school.contact_name || school.name,
    teacher_email: schoolEmail(school),
    teacher_phone: school.contact_phone || null,
    visit_day: payload.visit_day,
    visit_start: payload.visit_start,
    visit_end: payload.visit_end,
    headcount,
    notes: payload.notes || null,
  });

  return getBookingById(id);
}

/* Supprime une visite. */
async function deleteBooking(id) {
  const existing = await VisitBooking.findByPk(id);
  if (!existing) throw ApiError.notFound('Réservation introuvable');
  await existing.destroy();
  return { id };
}

/* Liste les réservations (orga). */
async function listBookings({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  const rows = await VisitBooking.findAll({
    where,
    include: [
      { model: Organization, as: 'organization', attributes: ['id', 'name', 'slug', 'city', 'lat', 'lng'] },
      {
        model: Organization,
        as: 'school',
        attributes: ['id', 'name', 'slug', 'city', 'contact_email', 'contact_phone', 'max_visitors'],
      },
    ],
    order: [['created_at', 'DESC']],
  });
  return attachPassage(rows);
}

/* Organisations labellisées filtrables (sites ou écoles). */
async function listBookableSites({ type } = {}) {
  const where = { label_status: 'approved', is_active: true };
  if (type === 'entreprise' || type === 'ecole') where.type = type;

  return Organization.findAll({
    where,
    attributes: [
      'id', 'name', 'slug', 'city', 'region', 'sector', 'type',
      'max_visitors', 'visit_slots', 'contact_name', 'contact_email', 'contact_phone',
      'lat', 'lng',
    ],
    order: [['name', 'ASC']],
  });
}

module.exports = {
  createBooking,
  updateBooking,
  deleteBooking,
  listBookings,
  listBookableSites,
  getBookingById,
};
