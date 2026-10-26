'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { GlobalResource } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { DOCS_DIR } = require('../../middlewares/upload.middleware');

/* Liste les ressources, programme en premier. */
async function listResources() {
  return GlobalResource.findAll({
    order: [
      ['is_primary', 'DESC'],
      ['created_at', 'DESC'],
    ],
  });
}

/* Retourne la ressource marquée programme. */
async function primaryResource() {
  return GlobalResource.findOne({
    where: { is_primary: true },
    order: [['updated_at', 'DESC']],
  });
}

/* Décoche les autres drapeaux programme. */
async function clearPrimary(exceptId) {
  const where = exceptId ? { id: { [Op.ne]: exceptId } } : {};
  await GlobalResource.update({ is_primary: false }, { where });
}

/* Interprète une case programme (formulaire). */
function wantsProgramme(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

/* Enregistre un fichier ; un seul programme à la fois. */
async function createResource({ title, file, isPrimary }) {
  const name = String(title || '').trim();
  if (!name) throw ApiError.badRequest('Indiquez un titre');
  if (!file?.filename) throw ApiError.badRequest('Ajoutez un fichier');

  const asProgramme = wantsProgramme(isPrimary);
  if (asProgramme) await clearPrimary();

  return GlobalResource.create({
    title: name.slice(0, 200),
    file_url: `/uploads/docs/${file.filename}`,
    is_primary: asProgramme,
  });
}

/* Marque ou retire le drapeau programme (exclusif). */
async function setPrimary(id, flagged = true) {
  const row = await GlobalResource.findByPk(id);
  if (!row) throw ApiError.notFound('Ressource introuvable');
  if (flagged) {
    await clearPrimary(id);
    row.is_primary = true;
  } else {
    row.is_primary = false;
  }
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
  await row.destroy();
  return { id, deleted: true };
}

module.exports = {
  listResources,
  primaryResource,
  wantsProgramme,
  createResource,
  setPrimary,
  removeResource,
};
