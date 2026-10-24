'use strict';

const entryResourceService = require('./entry-resource.service');
const ApiResponse = require('../../utils/ApiResponse');
const { audit } = require('../../utils/audit');

/* Liste les ressources d'une fiche acceptée. */
async function list(req, res, next) {
  try {
    const data = await entryResourceService.listForEntry(req.query.kind, req.query.id);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Ajoute une ressource à une fiche acceptée. */
async function create(req, res, next) {
  try {
    const data = await entryResourceService.createForEntry({
      kind: req.body?.kind,
      entryId: req.body?.id,
      title: req.body?.title,
      file: req.file,
    });
    await audit(req, {
      action: 'create',
      entityType: 'entry_resource',
      entityId: data.id,
      summary: `Ressource « ${data.title} » sur ${data.entry_kind}`,
    });
    return ApiResponse.created(res, data, 'Ressource ajoutée');
  } catch (err) {
    return next(err);
  }
}

/* Supprime une ressource d'une fiche. */
async function remove(req, res, next) {
  try {
    const data = await entryResourceService.removeFromEntry(req.params.id);
    await audit(req, {
      action: 'delete',
      entityType: 'entry_resource',
      entityId: data.id,
      summary: 'Suppression d’une ressource de fiche',
    });
    return ApiResponse.success(res, data, 'Ressource retirée');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, remove };
