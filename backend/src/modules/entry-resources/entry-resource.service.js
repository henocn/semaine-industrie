'use strict';

const fs = require('fs');
const path = require('path');
const {
  EntryResource,
  Organization,
  Participation,
  BusinessParticipant,
} = require('../../models');
const ApiError = require('../../utils/ApiError');
const { DOCS_DIR } = require('../../middlewares/upload.middleware');

const KINDS = ['organization', 'participation', 'business'];

/* Vérifie que le type de fiche est connu. */
function assertKind(kind) {
  if (!KINDS.includes(kind)) {
    throw ApiError.badRequest('Type de fiche invalide');
  }
}

/* Vérifie que la fiche existe et est acceptée. */
async function assertAcceptedEntry(kind, entryId) {
  assertKind(kind);
  if (!entryId) throw ApiError.badRequest('Fiche manquante');

  if (kind === 'organization') {
    const org = await Organization.findByPk(entryId);
    if (!org) throw ApiError.notFound('Organisation introuvable');
    if (org.label_status !== 'approved') {
      throw ApiError.badRequest('Ressources disponibles uniquement après acceptation');
    }
    return org;
  }

  if (kind === 'participation') {
    const row = await Participation.findByPk(entryId);
    if (!row) throw ApiError.notFound('Participation introuvable');
    if (row.status !== 'approved') {
      throw ApiError.badRequest('Ressources disponibles uniquement après acceptation');
    }
    return row;
  }

  const row = await BusinessParticipant.findByPk(entryId);
  if (!row) throw ApiError.notFound('Participant introuvable');
  if (row.status !== 'approved') {
    throw ApiError.badRequest('Ressources disponibles uniquement après acceptation');
  }
  return row;
}

/* Liste les fichiers d'une fiche. */
async function listForEntry(kind, entryId) {
  await assertAcceptedEntry(kind, entryId);
  return EntryResource.findAll({
    where: { entry_kind: kind, entry_id: entryId },
    order: [['created_at', 'DESC']],
  });
}

/* Liste interne (WhatsApp) sans exiger le statut. */
async function listByEntry(kind, entryId) {
  if (!KINDS.includes(kind) || !entryId) return [];
  return EntryResource.findAll({
    where: { entry_kind: kind, entry_id: entryId },
    order: [['created_at', 'ASC']],
  });
}

/* Ajoute un fichier titré à une fiche acceptée. */
async function createForEntry({ kind, entryId, title, file }) {
  await assertAcceptedEntry(kind, entryId);
  const name = String(title || '').trim();
  if (!name) throw ApiError.badRequest('Indiquez un titre');
  if (!file?.filename) throw ApiError.badRequest('Ajoutez un fichier');

  return EntryResource.create({
    entry_kind: kind,
    entry_id: entryId,
    title: name.slice(0, 200),
    file_url: `/uploads/docs/${file.filename}`,
    original_name: file.originalname ? String(file.originalname).slice(0, 255) : null,
  });
}

/* Retire un fichier d'une fiche (pas de suppression de données métier). */
async function removeFromEntry(id) {
  const row = await EntryResource.findByPk(id);
  if (!row) throw ApiError.notFound('Ressource introuvable');
  const filename = path.basename(String(row.file_url || ''));
  if (filename && filename !== '.' && filename !== '..') {
    const full = path.join(DOCS_DIR, filename);
    if (full.startsWith(DOCS_DIR) && fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
  }
  await row.destroy();
  return { id, deleted: true };
}

module.exports = {
  KINDS,
  listForEntry,
  listByEntry,
  createForEntry,
  removeFromEntry,
};
