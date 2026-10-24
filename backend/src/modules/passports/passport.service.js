'use strict';

const QRCode = require('qrcode');
const { Op, fn, col } = require('sequelize');
const { Passport, PassportVisit, Organization } = require('../../models');
const trackingService = require('../tracking/tracking.service');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');

/* Tampon posé à l'arrangement d'une visite : pas un passage réel. */
const ARRANGEMENT_STAMP = 'arrangement orga';

/* Génère le prochain code passeport du groupe (EC école, PA particulier). */
async function uniqueCode(kind, transaction) {
  const prefix = trackingService.prefixFor(kind === 'group' ? 'group' : 'individual');
  return trackingService.nextCode(prefix, transaction);
}

/* Enrichit un passeport avec URL publique + QR. */
async function withQr(passport) {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  const url = `${base}/passage/${passport.code}`;
  const qr_data_url = await QRCode.toDataURL(url, { width: 280, margin: 1 });
  return { ...passport.toJSON(), url, qr_data_url };
}

/* Crée un passeport de groupe (un seul code pour toute la classe / parcours). */
async function createGroup({
  school_name,
  class_label,
  headcount,
  school_organization_id,
  holder_name,
} = {}) {
  if (school_organization_id) {
    const school = await Organization.findOne({
      where: {
        id: school_organization_id,
        type: 'ecole',
        label_status: 'approved',
        is_active: true,
      },
    });
    if (!school) throw ApiError.notFound('Établissement introuvable ou non labellisé');

    const existing = await Passport.findOne({
      where: {
        kind: 'group',
        school_organization_id: school.id,
        is_active: true,
        class_label: class_label || null,
      },
    });
    if (existing) {
      if (headcount && !existing.headcount) {
        await existing.update({ headcount: Number(headcount) });
      }
      return withQr(existing);
    }

    const code = await uniqueCode('group');
    const passport = await Passport.create({
      code,
      kind: 'group',
      school_organization_id: school.id,
      school_name: school_name || school.name,
      class_label: class_label || null,
      headcount: headcount ? Number(headcount) : school.max_visitors || null,
      holder_name: holder_name || school.name,
    });
    return withQr(passport);
  }

  if (!school_name) throw ApiError.badRequest('École requise pour un passeport de groupe');

  const code = await uniqueCode('group');
  const passport = await Passport.create({
    code,
    kind: 'group',
    school_name,
    class_label: class_label || null,
    headcount: headcount ? Number(headcount) : null,
    holder_name: holder_name || school_name,
  });
  return withQr(passport);
}

/* Crée N passeports individuels (usage rare / hors visite groupée). */
async function createBatch({ count = 10, school_name, class_label } = {}) {
  const n = Math.min(Math.max(Number(count) || 10, 1), 200);
  const created = [];

  for (let i = 0; i < n; i += 1) {
    const code = await uniqueCode('individual');
    const passport = await Passport.create({
      code,
      kind: 'individual',
      school_name: school_name || null,
      class_label: class_label || null,
    });
    created.push(await withQr(passport));
  }

  return { count: created.length, items: created };
}

/* Crée un passeport individuel (une personne, un QR). */
async function createIndividual({ holder_name } = {}) {
  const name = String(holder_name || '').trim();
  if (!name) throw ApiError.badRequest('Nom requis');
  const code = await uniqueCode('individual');
  const passport = await Passport.create({
    code,
    kind: 'individual',
    holder_name: name,
  });
  return withQr(passport);
}

/* Fiche publique d'un passeport. */
async function getByCode(code) {
  const found = await trackingService.findByCode(code);
  if (found?.kind !== 'passport') throw ApiError.notFound('Passeport introuvable');
  const passport = await Passport.findOne({
    where: { id: found.passport.id, is_active: true },
    include: [{
      model: PassportVisit,
      as: 'visits',
      separate: true,
      order: [['scanned_at', 'ASC']],
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'slug', 'city'] }],
    }],
  });
  if (!passport) throw ApiError.notFound('Passeport introuvable');
  return passport;
}

/* Valide un passage : QR visiteur + code industrie. */
async function recordPassage({ visitorCode, industryCode }) {
  const visitor = await trackingService.findByCode(visitorCode);
  if (visitor?.kind !== 'passport') {
    throw ApiError.badRequest('QR visiteur introuvable');
  }
  const passport = visitor.passport;
  if (!passport?.is_active) throw ApiError.notFound('Passeport introuvable');

  const industry = await trackingService.findByCode(industryCode);
  if (industry?.kind !== 'organization' || industry.organization.type !== 'entreprise') {
    throw ApiError.badRequest('Code industrie invalide. Entrez le code de suivi de l\'industrie (IN-2001).');
  }
  const org = industry.organization;
  if (org.label_status !== 'approved' || !org.is_active) {
    throw ApiError.badRequest('Industrie non labellisée');
  }

  const already = Boolean(passport.passed_at);
  if (!passport.passed_at) {
    passport.passed_at = new Date();
    await passport.save();
  }

  const existing = await PassportVisit.findOne({
    where: { passport_id: passport.id, organization_id: org.id },
  });
  if (!existing) {
    await PassportVisit.create({
      passport_id: passport.id,
      organization_id: org.id,
      scanned_by: org.label_code || org.name,
      scanned_at: new Date(),
    });
  } else if (existing.scanned_by === ARRANGEMENT_STAMP) {
    /* Le tampon d'arrangement devient un passage réel. */
    existing.scanned_by = org.label_code || org.name;
    existing.scanned_at = new Date();
    await existing.save();
  }

  return {
    already,
    passage: true,
    visitor: {
      code: passport.code,
      name: passport.holder_name || passport.school_name || 'Visiteur',
      kind: passport.kind,
    },
    site: { name: org.name, code: org.label_code },
  };
}

/* Enregistre un tampon pour un site (un seul par site, valable pour tout le groupe). */
async function scanVisit({ code, organization_id, scanned_by }) {
  const found = await trackingService.findByCode(code);
  const passport = found?.kind === 'passport' ? found.passport : null;
  if (!passport) throw ApiError.notFound('Passeport introuvable');

  const org = await Organization.findOne({
    where: { id: organization_id, label_status: 'approved', is_active: true },
  });
  if (!org) throw ApiError.notFound('Site introuvable');

  const existing = await PassportVisit.findOne({
    where: { passport_id: passport.id, organization_id: org.id },
  });
  if (existing) throw ApiError.conflict('Visite déjà tamponnée pour ce site');

  const visit = await PassportVisit.create({
    passport_id: passport.id,
    organization_id: org.id,
    scanned_by: scanned_by || null,
    scanned_at: new Date(),
  });

  if (!passport.passed_at) {
    passport.passed_at = visit.scanned_at;
    await passport.save();
  }

  return { passport, visit, organization: org };
}

/* Trouve ou crée le passeport de groupe de l'école puis tamponne le site (appelé à l'arrangement). */
async function ensureGroupStampForBooking({ school, site, headcount, scanned_by }) {
  const item = await createGroup({
    school_organization_id: school.id,
    school_name: school.name,
    headcount: headcount || school.max_visitors || null,
    holder_name: school.name,
  });

  const passport = await Passport.findByPk(item.id);
  if (!passport) return item;

  const existing = await PassportVisit.findOne({
    where: { passport_id: passport.id, organization_id: site.id },
  });
  if (!existing) {
    await PassportVisit.create({
      passport_id: passport.id,
      organization_id: site.id,
      scanned_by: scanned_by || ARRANGEMENT_STAMP,
      scanned_at: new Date(),
    });
  }

  return withQr(passport);
}

/* Nombre de passages réels par passeport (tampons d'arrangement exclus). */
async function countPassages(passports) {
  const list = passports.filter(Boolean);
  if (!list.length) return new Map();
  const rows = await PassportVisit.findAll({
    where: {
      passport_id: list.map((p) => p.id),
      [Op.or]: [{ scanned_by: null }, { scanned_by: { [Op.ne]: ARRANGEMENT_STAMP } }],
    },
    attributes: ['passport_id', [fn('COUNT', col('id')), 'total']],
    group: ['passport_id'],
    raw: true,
  });
  const counts = new Map(rows.map((row) => [row.passport_id, Number(row.total)]));
  /* Ancien passage posé sur un tampon d'arrangement : compte au moins 1. */
  return new Map(list.map((p) => [p.id, Math.max(counts.get(p.id) || 0, p.passed_at ? 1 : 0)]));
}

/* Compte total des scans. */
async function countScans() {
  return PassportVisit.count();
}

module.exports = {
  createBatch,
  createIndividual,
  createGroup,
  withQr,
  getByCode,
  recordPassage,
  scanVisit,
  ensureGroupStampForBooking,
  countScans,
  countPassages,
};
