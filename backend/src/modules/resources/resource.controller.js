'use strict';

const resourceService = require('./resource.service');
const ApiResponse = require('../../utils/ApiResponse');
const { audit } = require('../../utils/audit');
const { emitRealtime } = require('../../realtime/io');

/* Diffuse un changement de ressource au backoffice. */
function emitResource(action, data) {
  emitRealtime('resource:changed', { action, id: data?.id }, 'orga');
}

/* Liste publique des ressources globales. */
async function listPublic(req, res, next) {
  try {
    return ApiResponse.success(res, await resourceService.listResources());
  } catch (err) {
    return next(err);
  }
}

/* Ajoute une ressource (orga). */
async function create(req, res, next) {
  try {
    const data = await resourceService.createResource({
      title: req.body?.title,
      file: req.file,
      isPrimary: req.body?.is_primary,
    });
    await audit(req, {
      action: 'create',
      entityType: 'global_resource',
      entityId: data.id,
      summary: `Ressource « ${data.title} »`,
    });
    emitResource('create', data);
    return ApiResponse.created(res, data, 'Ressource ajoutée');
  } catch (err) {
    return next(err);
  }
}

/* Définit ou retire le fichier programme. */
async function setPrimary(req, res, next) {
  try {
    const on = req.body?.is_primary === undefined
      || resourceService.wantsProgramme(req.body?.is_primary);
    const data = await resourceService.setPrimary(req.params.id, on);
    await audit(req, {
      action: 'update',
      entityType: 'global_resource',
      entityId: data.id,
      summary: on ? `Programme : ${data.title}` : `Programme retiré : ${data.title}`,
    });
    emitResource('update', data);
    return ApiResponse.success(res, data, on ? 'Programme mis à jour' : 'Programme retiré');
  } catch (err) {
    return next(err);
  }
}

/* Supprime une ressource. */
async function remove(req, res, next) {
  try {
    const data = await resourceService.removeResource(req.params.id);
    await audit(req, {
      action: 'delete',
      entityType: 'global_resource',
      entityId: data.id,
      summary: 'Suppression d’une ressource',
    });
    emitResource('delete', data);
    return ApiResponse.success(res, data, 'Ressource supprimée');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPublic,
  create,
  setPrimary,
  remove,
};
