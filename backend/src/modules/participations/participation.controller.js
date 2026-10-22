'use strict';

const service = require('./participation.service');
const { listSchema } = require('./participation.validation');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { audit } = require('../../utils/audit');

/* Liste les participations. */
async function list(req, res, next) {
  try {
    const { error, value } = listSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) return next(ApiError.badRequest('Données invalides'));
    return ApiResponse.success(res, await service.list(value));
  } catch (err) {
    return next(err);
  }
}

/* Fiche avec QR. */
async function getOne(req, res, next) {
  try {
    return ApiResponse.success(res, await service.getById(req.params.id));
  } catch (err) {
    return next(err);
  }
}

/* Crée une participation. */
async function create(req, res, next) {
  try {
    const data = await service.create(req.body);
    await audit(req, {
      action: 'create',
      entityType: 'participation',
      entityId: data.id,
      summary: `Participation ${data.kind} « ${data.name} »`,
    });
    return ApiResponse.created(res, data, 'Participation enregistrée');
  } catch (err) {
    return next(err);
  }
}

/* Met à jour une participation. */
async function update(req, res, next) {
  try {
    const data = await service.update(req.params.id, req.body);
    await audit(req, {
      action: 'update',
      entityType: 'participation',
      entityId: data.id,
      summary: `Participation « ${data.name} » mise à jour`,
    });
    return ApiResponse.success(res, data, 'Participation mise à jour');
  } catch (err) {
    return next(err);
  }
}

/* Accepte et délivre le QR. */
async function approve(req, res, next) {
  try {
    const data = await service.approve(req.params.id);
    await audit(req, {
      action: 'approve',
      entityType: 'participation',
      entityId: data.id,
      summary: `QR participation « ${data.name} »`,
    });
    return ApiResponse.success(res, data, 'Participation acceptée');
  } catch (err) {
    return next(err);
  }
}

/* Refuse une participation. */
async function reject(req, res, next) {
  try {
    const data = await service.reject(req.params.id);
    await audit(req, {
      action: 'reject',
      entityType: 'participation',
      entityId: data.id,
      summary: `Participation « ${data.name} » refusée`,
    });
    return ApiResponse.success(res, data, 'Participation refusée');
  } catch (err) {
    return next(err);
  }
}

/* Supprime une participation. */
async function remove(req, res, next) {
  try {
    const data = await service.remove(req.params.id);
    await audit(req, {
      action: 'delete',
      entityType: 'participation',
      entityId: data.id,
      summary: 'Participation supprimée',
    });
    return ApiResponse.success(res, data, 'Participation supprimée');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  approve,
  reject,
  remove,
};
