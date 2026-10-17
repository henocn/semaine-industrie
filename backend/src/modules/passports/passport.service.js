'use strict';

const crypto = require('crypto');
const QRCode = require('qrcode');
const { Passport, PassportVisit, Organization } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');

/* Génère un code passeport court unique. */
async function uniqueCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = `P${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const exists = await Passport.findOne({ where: { code } });
    if (!exists) return code;
  }
  throw ApiError.internal('Impossible de générer un code passeport');
}

/* Enrichit un passeport avec URL publique + QR. */
async function withQr(passport) {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  const url = `${base}/passeport/${passport.code}`;
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

    const code = await uniqueCode();
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

  const code = await uniqueCode();
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
    const code = await uniqueCode();
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

/* Fiche publique d'un passeport. */
async function getByCode(code) {
  const passport = await Passport.findOne({
    where: { code: String(code).toUpperCase(), is_active: true },
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

/* Enregistre un tampon pour un site (un seul par site, valable pour tout le groupe). */
async function scanVisit({ code, organization_id, scanned_by }) {
  const passport = await Passport.findOne({
    where: { code: String(code).toUpperCase(), is_active: true },
  });
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
      scanned_by: scanned_by || 'arrangement orga',
      scanned_at: new Date(),
    });
  }

  return withQr(passport);
}

/* Compte total des scans. */
async function countScans() {
  return PassportVisit.count();
}

module.exports = {
  createBatch,
  createGroup,
  getByCode,
  scanVisit,
  ensureGroupStampForBooking,
  countScans,
};
