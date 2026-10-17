'use strict';

const { Op } = require('sequelize');
const QRCode = require('qrcode');
const { LabelRequest, Organization, sequelize } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { notifyN8n } = require('../../utils/n8n');

/* Transforme un nom en slug URL. */
function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/* Garantit un slug unique pour Organization. */
async function uniqueSlug(baseName, transaction) {
  const base = slugify(baseName) || 'structure';
  let slug = base;
  let i = 2;
  while (await Organization.findOne({ where: { slug }, transaction })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

/* Génère un code label court unique. */
async function uniqueLabelCode(transaction) {
  const year = new Date().getFullYear().toString().slice(-2);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const n = Math.floor(1000 + Math.random() * 9000);
    const code = `SI${year}-${n}`;
    const exists = await Organization.findOne({ where: { label_code: code }, transaction });
    if (!exists) return code;
  }
  throw ApiError.internal('Impossible de générer un code label');
}

/* Crée une demande de label (parcours public). */
async function createRequest(payload) {
  const data = { ...payload };
  /* Écoles : pas de secteur, produits ni règles sécurité. */
  if (data.structure_type === 'ecole') {
    data.sector = null;
    data.products = [];
    data.safety_rules = null;
  }
  /* Référent non demandé au public : repli sur le nom de structure. */
  data.contact_name = data.contact_name || data.structure_name;
  const row = await LabelRequest.create({
    ...data,
    status: 'pending',
  });
  return row;
}

/* Liste les demandes, filtrables par statut. */
async function listRequests({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  return LabelRequest.findAll({
    where,
    order: [['created_at', 'DESC']],
  });
}

/* Récupère une demande par id. */
async function getRequestById(id) {
  const row = await LabelRequest.findByPk(id);
  if (!row) throw ApiError.notFound('Demande introuvable');
  return row;
}

/* Met à jour une demande (orga) et synchronise la fiche si déjà labellisée. */
async function updateRequest(id, payload) {
  const request = await getRequestById(id);
  const data = { ...payload };
  const nextType = data.structure_type || request.structure_type;

  if (nextType === 'ecole') {
    data.sector = null;
    data.products = [];
    data.safety_rules = null;
  }

  Object.assign(request, data);
  if (!request.contact_name) request.contact_name = request.structure_name;
  await request.save();

  if (request.organization_id) {
    const org = await Organization.findByPk(request.organization_id);
    if (org) {
      org.name = request.structure_name;
      org.type = request.structure_type;
      org.sector = request.sector;
      org.region = request.region;
      org.city = request.city;
      org.contact_email = request.contact_email;
      org.contact_phone = request.contact_phone;
      org.contact_name = request.contact_name;
      org.description = request.description;
      org.products = request.products || [];
      org.max_visitors = request.max_visitors;
      org.safety_rules = request.safety_rules;
      org.lat = request.lat;
      org.lng = request.lng;
      await org.save();
    }
  }

  return request;
}

/* Approuve ou rejette une demande ; crée l'organisation si approuvée. */
async function reviewRequest(id, { status, review_note }) {
  return sequelize.transaction(async (transaction) => {
    const request = await LabelRequest.findByPk(id, { transaction, lock: true });
    if (!request) throw ApiError.notFound('Demande introuvable');
    if (request.status !== 'pending') {
      throw ApiError.conflict('Cette demande a déjà été traitée');
    }

    request.status = status;
    request.review_note = review_note || null;
    request.reviewed_at = new Date();

    if (status === 'rejected') {
      await request.save({ transaction });
      return { request, organization: null };
    }

    const slug = await uniqueSlug(request.structure_name, transaction);
    const label_code = await uniqueLabelCode(transaction);

    const organization = await Organization.create(
      {
        name: request.structure_name,
        slug,
        type: request.structure_type,
        sector: request.sector,
        region: request.region,
        city: request.city,
        address: request.address,
        lat: request.lat,
        lng: request.lng,
        contact_name: request.contact_name,
        contact_email: request.contact_email,
        contact_phone: request.contact_phone,
        description: request.description,
        products: request.products || [],
        photo_url: request.photo_url,
        max_visitors: request.max_visitors,
        visit_slots: request.visit_slots || [],
        safety_rules: request.safety_rules,
        label_code,
        label_status: 'approved',
        labeled_at: new Date(),
        is_active: true,
      },
      { transaction },
    );

    request.organization_id = organization.id;
    await request.save({ transaction });

    await notifyN8n('label.approved', {
      organization_id: organization.id,
      name: organization.name,
      slug: organization.slug,
      label_code: organization.label_code,
      contact_email: organization.contact_email,
      contact_name: organization.contact_name,
      fiche_url: `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/o/${organization.slug}`,
    });

    return { request, organization };
  });
}

/* Fiche publique d'une organisation labellisée. */
async function getPublicBySlug(slug) {
  const org = await Organization.findOne({
    where: {
      slug,
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!org) throw ApiError.notFound('Fiche introuvable');
  return org;
}

/* Points carte : organisations labellisées avec coordonnées. */
async function listMapPoints({ region, sector } = {}) {
  const where = {
    label_status: 'approved',
    is_active: true,
    lat: { [Op.ne]: null },
    lng: { [Op.ne]: null },
  };
  if (region) where.region = region;
  if (sector) where.sector = sector;

  return Organization.findAll({
    where,
    attributes: [
      'id', 'name', 'slug', 'type', 'sector', 'region', 'city',
      'lat', 'lng', 'label_code', 'products',
    ],
    order: [['name', 'ASC']],
  });
}

/* Génère les QR (data URL PNG) pour toutes les fiches labellisées. */
async function listQrBatch() {
  const orgs = await Organization.findAll({
    where: { label_status: 'approved', is_active: true, slug: { [Op.ne]: null } },
    attributes: ['id', 'name', 'slug', 'label_code', 'type', 'city', 'region'],
    order: [['name', 'ASC']],
  });

  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  const items = [];

  for (const org of orgs) {
    const fiche_url = `${base}/o/${org.slug}`;
    const qr_data_url = await QRCode.toDataURL(fiche_url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
    });
    items.push({
      id: org.id,
      name: org.name,
      slug: org.slug,
      label_code: org.label_code,
      type: org.type,
      city: org.city,
      region: org.region,
      fiche_url,
      qr_data_url,
    });
  }

  return { count: items.length, items };
}

module.exports = {
  createRequest,
  listRequests,
  getRequestById,
  updateRequest,
  reviewRequest,
  getPublicBySlug,
  listMapPoints,
  listQrBatch,
};
