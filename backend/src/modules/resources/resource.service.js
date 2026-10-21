'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { GlobalResource } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { DOCS_DIR } = require('../../middlewares/upload.middleware');

/* Liste les ressources, principale en premier. */
async function listResources() {
  return GlobalResource.findAll({
    order: [
      ['is_primary', 'DESC'],
      ['created_at', 'DESC'],
    ],
  });
}

/* Retourne l'URL de la ressource marquée principale. */
async function primaryResourceUrl() {
  const row = await GlobalResource.findOne({
    where: { is_primary: true },
    order: [['updated_at', 'DESC']],
  });
  return row?.file_url || null;
}

/* Décoche les autres ressources principales. */
async function clearPrimary(exceptId) {
  const where = exceptId ? { id: { [Op.ne]: exceptId } } : {};
  await GlobalResource.update({ is_primary: false }, { where });
}

/* Enregistre un PDF et peut le marquer comme ressource principale. */
async function createResource({ title, file, isPrimary }) {
  const name = String(title || '').trim();
  if (!name) throw ApiError.badRequest('Indiquez un titre');
  if (!file?.filename) throw ApiError.badRequest('Ajoutez un fichier PDF');

  const fileUrl = `/uploads/docs/${file.filename}`;
  const wantPrimary = isPrimary === true || isPrimary === 'true' || isPrimary === '1' || isPrimary === 'on';
  const existingPrimary = await GlobalResource.count({ where: { is_primary: true } });
  const primary = wantPrimary || existingPrimary === 0;

  if (primary) await clearPrimary();

  return GlobalResource.create({
    title: name.slice(0, 200),
    file_url: fileUrl,
    is_primary: primary,
  });
}

/* Marque une ressource comme PDF principal de la semaine. */
async function setPrimary(id) {
  const row = await GlobalResource.findByPk(id);
  if (!row) throw ApiError.notFound('Ressource introuvable');
  await clearPrimary(id);
  row.is_primary = true;
  await row.save();
  return row;
}

/* Supprime une ressource et son fichier. */
async function removeResource(id) {
  const row = await GlobalResource.findByPk(id);
  if (!row) throw ApiError.notFound('Ressource introuvable');
  const filename = path.basename(String(row.file_url || ''));
  if (filename && filename !== '.' && filename !== '..') {
    const full = path.join(DOCS_DIR, filename);
    if (full.startsWith(DOCS_DIR) && fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
  }
  const wasPrimary = row.is_primary;
  await row.destroy();
  if (wasPrimary) {
    const next = await GlobalResource.findOne({ order: [['created_at', 'DESC']] });
    if (next) {
      next.is_primary = true;
      await next.save();
    }
  }
  return { id, deleted: true };
}

module.exports = {
  listResources,
  primaryResourceUrl,
  createResource,
  setPrimary,
  removeResource,
};
