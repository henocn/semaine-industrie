'use strict';

const labelService = require('./label.service');
const ApiResponse = require('../../utils/ApiResponse');
const { emitRealtime } = require('../../realtime/io');

/* Crée une demande de label. */
async function createRequest(req, res, next) {
  try {
    const data = await labelService.createRequest(req.body);
    emitRealtime('label:created', data, 'orga');
    return ApiResponse.created(res, data, 'Demande de label enregistrée');
  } catch (err) {
    return next(err);
  }
}

/* Liste les demandes (orga). */
async function listRequests(req, res, next) {
  try {
    const data = await labelService.listRequests({ status: req.query.status });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Détail d'une demande. */
async function getRequest(req, res, next) {
  try {
    const data = await labelService.getRequestById(req.params.id);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Modifie une demande (orga). */
async function updateRequest(req, res, next) {
  try {
    const data = await labelService.updateRequest(req.params.id, req.body);
    emitRealtime('label:updated', data, 'orga');
    return ApiResponse.success(res, data, 'Demande mise à jour');
  } catch (err) {
    return next(err);
  }
}

/* Approuve ou rejette une demande. */
async function reviewRequest(req, res, next) {
  try {
    const data = await labelService.reviewRequest(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Demande traitée');
  } catch (err) {
    return next(err);
  }
}

/* Fiche publique par slug. */
async function getPublicFiche(req, res, next) {
  try {
    const data = await labelService.getPublicBySlug(req.params.slug);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Points pour la carte. */
async function listMap(req, res, next) {
  try {
    const data = await labelService.listMapPoints({
      region: req.query.region,
      sector: req.query.sector,
    });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Lot de QR pour impression. */
async function listQrBatch(req, res, next) {
  try {
    const data = await labelService.listQrBatch();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  updateRequest,
  reviewRequest,
  getPublicFiche,
  listMap,
  listQrBatch,
};
