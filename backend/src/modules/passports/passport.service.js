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

/* Crée N passeports (lot pour impression). */
async function createBatch({ count = 10, school_name, class_label } = {}) {
  const n = Math.min(Math.max(Number(count) || 10, 1), 200);
  const created = [];
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');

  for (let i = 0; i < n; i += 1) {
    const code = await uniqueCode();
    const passport = await Passport.create({
      code,
      school_name: school_name || null,
      class_label: class_label || null,
    });
    const url = `${base}/passeport/${code}`;
    const qr_data_url = await QRCode.toDataURL(url, { width: 280, margin: 1 });
    created.push({ ...passport.toJSON(), url, qr_data_url });
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

/* Enregistre un scan (tampon) pour une visite. */
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

/* Compte total des scans. */
async function countScans() {
  return PassportVisit.count();
}

module.exports = { createBatch, getByCode, scanVisit, countScans };
