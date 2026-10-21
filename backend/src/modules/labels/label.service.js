'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { LabelRequest, Organization, VisitBooking, sequelize } = require('../../models');
const engagementService = require('../engagement/engagement.service');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { notifyN8n } = require('../../utils/n8n');
const whatsappService = require('../whatsapp/whatsapp.service');
const logger = require('../../utils/logger');
const { DOCS_DIR } = require('../../middlewares/upload.middleware');

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

/* Normalise les champs selon le type (école / industrie). */
function normalizeByType(data) {
  const next = { ...data };
  if (next.structure_type === 'ecole') {
    next.sector = null;
    next.products = [];
    next.safety_rules = null;
    next.gallery_urls = [];
    next.photo_url = null;
  } else {
    const gallery = Array.isArray(next.gallery_urls) ? next.gallery_urls : [];
    next.gallery_urls = gallery;
    next.photo_url = gallery[0] || next.photo_url || null;
  }
  next.contact_name = next.contact_name || next.structure_name;
  return next;
}

/* Crée une demande de label (parcours public). */
async function createRequest(payload) {
  const data = normalizeByType({ ...payload });
  if (data.structure_type === 'entreprise') {
    const gallery = Array.isArray(data.gallery_urls) ? data.gallery_urls : [];
    if (gallery.length !== 3) {
      throw ApiError.badRequest('Trois images de bonne qualité sont obligatoires pour une industrie');
    }
  }
  const row = await LabelRequest.create({
    ...data,
    status: 'pending',
  });
  return row;
}

/* Crée une demande depuis le backoffice (sans galerie obligatoire). */
async function createRequestByOrga(payload) {
  const data = normalizeByType({ ...payload });
  if (!Array.isArray(data.gallery_urls)) data.gallery_urls = [];
  if (!Array.isArray(data.products)) data.products = [];
  const row = await LabelRequest.create({
    ...data,
    status: 'pending',
  });
  return row;
}

/* Normalise la liste kit (repli sur l'ancien PDF unique). */
function normalizeKitFiles(orgLike) {
  const raw = Array.isArray(orgLike?.kit_files) ? orgLike.kit_files : [];
  if (raw.length) return raw;
  const url = orgLike?.label_document_url;
  if (!url) return [];
  return [
    {
      id: 'legacy',
      name: 'kit.pdf',
      url,
      mime: 'application/pdf',
      size: null,
    },
  ];
}

/* Choisit l'URL principale (PDF prioritaire) pour WhatsApp / code suivi. */
function primaryKitUrl(kitFiles) {
  if (!Array.isArray(kitFiles) || !kitFiles.length) return null;
  const pdf = kitFiles.find(
    (f) =>
      String(f.mime || '').includes('pdf') ||
      String(f.url || '').toLowerCase().endsWith('.pdf') ||
      String(f.name || '').toLowerCase().endsWith('.pdf'),
  );
  return (pdf || kitFiles[0])?.url || null;
}

/* Construit une entrée kit depuis un fichier multer. */
function kitEntryFromFile(file) {
  return {
    id: uuidv4(),
    name: String(file.originalname || file.filename || 'fichier').slice(0, 200),
    url: `/uploads/docs/${file.filename}`,
    mime: file.mimetype || null,
    size: Number.isFinite(file.size) ? file.size : null,
  };
}

/* Supprime le fichier disque d'une entrée kit si possible. */
function unlinkKitFile(entry) {
  const url = String(entry?.url || '');
  if (!url.startsWith('/uploads/docs/')) return;
  const filename = path.basename(url);
  const full = path.join(DOCS_DIR, filename);
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    /* non bloquant */
  }
}

/* Enrichit une demande avec code + fichiers kit. */
function withOrgExtras(row) {
  const json = row.toJSON ? row.toJSON() : { ...row };
  const org = json.organization || null;
  json.label_code = org?.label_code || json.label_code || null;
  const kit = normalizeKitFiles(org || json);
  json.kit_files = kit;
  json.label_document_url = primaryKitUrl(kit) || org?.label_document_url || json.label_document_url || null;
  return json;
}

/* Liste les demandes, filtrables par statut (+ code / kit si accepté). */
async function listRequests({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  const rows = await LabelRequest.findAll({
    where,
    include: [
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'label_code', 'label_document_url', 'kit_files'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
  });
  return rows.map((row) => withOrgExtras(row));
}

/* Récupère une demande par id. */
async function getRequestById(id) {
  const row = await LabelRequest.findByPk(id);
  if (!row) throw ApiError.notFound('Demande introuvable');
  return row;
}

/* Met à jour une demande. Une fiche déjà acceptée est recopiée sur l'organisation. */
async function updateRequest(id, payload) {
  const request = await getRequestById(id);
  const previousName = request.structure_name;
  const data = { ...payload };
  const nextType = data.structure_type || request.structure_type;
  if (nextType === 'ecole') {
    data.sector = null;
    data.products = [];
    data.safety_rules = null;
  }

  Object.assign(request, data);
  if (!request.contact_name || request.contact_name === previousName) {
    request.contact_name = request.structure_name;
  }
  await request.save();

  if (request.status === 'approved' && request.organization_id) {
    const org = await Organization.findByPk(request.organization_id);
    if (org) {
      org.name = request.structure_name;
      org.type = request.structure_type;
      org.sector = request.sector;
      org.region = request.region;
      org.city = request.city;
      org.address = request.address;
      org.lat = request.lat;
      org.lng = request.lng;
      org.contact_name = request.contact_name;
      org.contact_email = request.contact_email;
      org.contact_phone = request.contact_phone;
      org.description = request.description;
      org.products = request.products || [];
      org.max_visitors = request.max_visitors;
      org.safety_rules = request.safety_rules;
      await org.save();
    }
  }

  return getEnrichedRequest(id);
}

/* Recharge une demande enrichie (code + kit). */
async function getEnrichedRequest(id) {
  const fresh = await LabelRequest.findByPk(id, {
    include: [
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'label_code', 'label_document_url', 'kit_files'],
        required: false,
      },
    ],
  });
  if (!fresh) throw ApiError.notFound('Demande introuvable');
  return withOrgExtras(fresh);
}

/* Ajoute un fichier au kit d'une organisation acceptée. */
async function addKitFile(id, file) {
  if (!file?.filename) throw ApiError.badRequest('Fichier kit requis');

  const request = await getRequestById(id);
  if (request.status !== 'approved' || !request.organization_id) {
    throw ApiError.badRequest('Kit modifiable uniquement après acceptation');
  }

  const org = await Organization.findByPk(request.organization_id);
  if (!org) throw ApiError.notFound('Organisation introuvable');

  const entry = kitEntryFromFile(file);
  const next = [...normalizeKitFiles(org), entry];
  org.kit_files = next;
  org.label_document_url = primaryKitUrl(next);
  await org.save();
  return getEnrichedRequest(id);
}

/* Remplace / ajoute via l'ancien endpoint PDF (rétrocompat). */
async function updateLabelDocument(id, label_document_url, fileMeta = null) {
  const doc = String(label_document_url || '').trim();
  if (!doc || !doc.startsWith('/uploads/docs/')) {
    throw ApiError.badRequest('Fichier kit invalide');
  }
  return addKitFile(id, {
    filename: path.basename(doc),
    originalname: fileMeta?.originalname || path.basename(doc),
    mimetype: fileMeta?.mimetype || 'application/pdf',
    size: fileMeta?.size ?? null,
  });
}

/* Supprime un fichier du kit. */
async function removeKitFile(id, fileId) {
  const request = await getRequestById(id);
  if (request.status !== 'approved' || !request.organization_id) {
    throw ApiError.badRequest('Kit modifiable uniquement après acceptation');
  }

  const org = await Organization.findByPk(request.organization_id);
  if (!org) throw ApiError.notFound('Organisation introuvable');

  const current = normalizeKitFiles(org);
  const target = current.find((f) => f.id === fileId);
  if (!target) throw ApiError.notFound('Fichier introuvable dans le kit');

  const next = current.filter((f) => f.id !== fileId);
  unlinkKitFile(target);
  org.kit_files = next;
  org.label_document_url = primaryKitUrl(next);
  await org.save();
  return getEnrichedRequest(id);
}

/* Supprime une demande et désactive la fiche liée si elle existe. */
async function deleteRequest(id) {
  const request = await getRequestById(id);
  const orgId = request.organization_id;
  await request.destroy();

  if (orgId) {
    const org = await Organization.findByPk(orgId);
    if (org) {
      org.is_active = false;
      org.label_status = 'rejected';
      await org.save();
      await engagementService.retireVoteOptionsForOrganization(org);
    } else {
      await engagementService.retireVoteOptionsForOrganization({ id: orgId });
    }
  }

  return { id, deleted: true };
}

/* Retire les champs sensibles d'une fiche publique. */
function toPublicOrg(org) {
  const json = typeof org.toJSON === 'function' ? org.toJSON() : { ...org };
  delete json.label_code;
  delete json.label_document_url;
  delete json.contact_email;
  delete json.contact_phone;
  return json;
}

/* URL absolue pour un chemin /uploads/... */
function absolutePublicUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/* Approuve ou rejette une demande ; crée l'organisation si approuvée. */
async function reviewRequest(id, { status, review_note, label_document_url, kit_file = null }) {
  let initialKit = [];
  if (status === 'approved' && kit_file?.filename) {
    initialKit = [kitEntryFromFile(kit_file)];
  } else if (status === 'approved') {
    const doc = String(label_document_url || '').trim();
    if (doc.startsWith('/uploads/docs/')) {
      initialKit = [
        {
          id: uuidv4(),
          name: path.basename(doc),
          url: doc,
          mime: 'application/pdf',
          size: null,
        },
      ];
    }
  }

  const result = await sequelize.transaction(async (transaction) => {
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
        photo_url: (request.gallery_urls && request.gallery_urls[0]) || request.photo_url,
        gallery_urls: request.gallery_urls || [],
        max_visitors: request.max_visitors,
        visit_slots: request.visit_slots || [],
        safety_rules: request.safety_rules,
        label_code,
        kit_files: initialKit,
        label_document_url: primaryKitUrl(initialKit),
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
      contact_phone: organization.contact_phone,
      contact_name: organization.contact_name,
      fiche_url: `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/o/${organization.slug}`,
    });

    return { request, organization };
  });

  /* WhatsApp : récap + code de suivi (hors transaction). */
  if (result.organization) {
    whatsappService.notifyLabelApproved(result.organization).catch((err) => {
      logger.warn('[label] notify WhatsApp failed', err.message);
    });
  }

  return result;
}

/* Fiche publique d'une organisation labellisée (sans code de suivi). */
async function getPublicBySlug(slug) {
  const org = await Organization.findOne({
    where: {
      slug,
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!org) throw ApiError.notFound('Fiche introuvable');
  return toPublicOrg(org);
}

/* Liste publique des industries (entreprises labellisées). */
async function listPublicIndustries() {
  const rows = await Organization.findAll({
    where: {
      type: 'entreprise',
      label_status: 'approved',
      is_active: true,
    },
    attributes: [
      'id', 'name', 'slug', 'sector', 'region', 'city',
      'description', 'products', 'photo_url', 'gallery_urls',
    ],
    order: [['name', 'ASC']],
  });
  return rows.map((r) => toPublicOrg(r));
}

/* Vérifie un code de suivi et renvoie les liens de téléchargement. */
async function verifyTrackingCode(rawCode) {
  const code = String(rawCode || '')
    .trim()
    .toUpperCase();
  if (!/^SI\d{2}-\d{4}$/.test(code)) {
    throw ApiError.badRequest('Code de suivi invalide');
  }
  const org = await Organization.findOne({
    where: {
      label_code: code,
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!org) throw ApiError.notFound('Code de suivi introuvable');
  const kit = normalizeKitFiles(org);
  const primary = primaryKitUrl(kit);
  if (!primary) {
    throw ApiError.conflict('Document label pas encore disponible');
  }

  return {
    organization_name: org.name,
    type: org.type,
    label_pdf_url: absolutePublicUrl(primary),
    kit_files: kit.map((f) => ({
      id: f.id,
      name: f.name,
      url: absolutePublicUrl(f.url),
      mime: f.mime || null,
    })),
    programme_pdf_url: absolutePublicUrl(getProgrammePdfPath()),
  };
}

/* Met à jour l'URL du PDF programme (orga). */
async function setProgrammePdfUrl(url) {
  const path = String(url || '').trim();
  if (!path.startsWith('/uploads/docs/')) {
    throw ApiError.badRequest('Chemin PDF programme invalide');
  }
  /* Persistance simple via .env non possible ici : on écrit un fichier pointeur. */
  const fs = require('fs');
  const pointer = require('path').join(__dirname, '../../../uploads/docs/programme-current.txt');
  fs.writeFileSync(pointer, path, 'utf8');
  return { programme_pdf_url: absolutePublicUrl(path), path };
}

/* Lit le PDF programme courant (pointeur ou env). */
function getProgrammePdfPath() {
  const fs = require('fs');
  const pathMod = require('path');
  const pointer = pathMod.join(__dirname, '../../../uploads/docs/programme-current.txt');
  if (fs.existsSync(pointer)) {
    const stored = fs.readFileSync(pointer, 'utf8').trim();
    if (stored.startsWith('/uploads/docs/')) return stored;
  }
  return env.PROGRAMME_PDF_URL;
}

/* Points carte : sites labellisés + arrangements de visite. */
async function listMapPoints({ region, sector, type } = {}) {
  const where = {
    label_status: 'approved',
    is_active: true,
    lat: { [Op.ne]: null },
    lng: { [Op.ne]: null },
  };
  if (region) where.region = region;
  if (sector) where.sector = sector;
  if (type === 'entreprise' || type === 'ecole') where.type = type;

  const orgs = await Organization.findAll({
    where,
    attributes: [
      'id', 'name', 'slug', 'type', 'sector', 'region', 'city',
      'lat', 'lng', 'products', 'max_visitors', 'description',
    ],
    order: [['name', 'ASC']],
  });

  const siteIds = orgs.filter((o) => o.type === 'entreprise').map((o) => o.id);
  const bookings = siteIds.length
    ? await VisitBooking.findAll({
        where: {
          organization_id: { [Op.in]: siteIds },
          status: { [Op.in]: ['pending', 'confirmed'] },
        },
        attributes: [
          'organization_id',
          'school_name',
          'visit_day',
          'visit_start',
          'visit_end',
          'headcount',
        ],
        order: [
          ['visit_day', 'ASC'],
          ['visit_start', 'ASC'],
        ],
      })
    : [];

  const bySite = {};
  for (const b of bookings) {
    const id = b.organization_id;
    if (!bySite[id]) bySite[id] = [];
    /* Public : pas de contacts (e-mail / téléphone). */
    bySite[id].push({
      school_name: b.school_name,
      visit_day: b.visit_day,
      visit_start: b.visit_start,
      visit_end: b.visit_end,
      headcount: b.headcount,
    });
  }

  return orgs.map((o) => {
    const json = toPublicOrg(o);
    const items = bySite[o.id] || [];
    return {
      ...json,
      visits: {
        groups: items.length,
        headcount: items.reduce((sum, v) => sum + Number(v.headcount || 0), 0),
        items,
      },
    };
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

/* QR d'une demande acceptée (fiche publique). */
async function getQrForRequest(requestId) {
  const row = await LabelRequest.findByPk(requestId);
  if (!row) throw ApiError.notFound('Demande introuvable');
  if (row.status !== 'approved' || !row.organization_id) {
    throw ApiError.badRequest('QR disponible uniquement pour un label accepté');
  }

  const org = await Organization.findByPk(row.organization_id, {
    attributes: ['id', 'name', 'slug', 'label_code', 'type', 'city', 'region'],
  });
  if (!org || !org.slug) throw ApiError.notFound('Organisation introuvable');

  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  const fiche_url = `${base}/o/${org.slug}`;
  const qr_data_url = await QRCode.toDataURL(fiche_url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    label_code: org.label_code,
    type: org.type,
    city: org.city,
    region: org.region,
    fiche_url,
    qr_data_url,
  };
}

module.exports = {
  createRequest,
  createRequestByOrga,
  listRequests,
  getRequestById,
  updateRequest,
  updateLabelDocument,
  addKitFile,
  removeKitFile,
  deleteRequest,
  reviewRequest,
  getPublicBySlug,
  listPublicIndustries,
  listMapPoints,
  listQrBatch,
  getQrForRequest,
  verifyTrackingCode,
  setProgrammePdfUrl,
  getProgrammePdfPath,
  absolutePublicUrl,
  toPublicOrg,
};
