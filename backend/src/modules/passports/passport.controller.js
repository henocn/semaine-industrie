'use strict';

const passportService = require('./passport.service');
const ApiResponse = require('../../utils/ApiResponse');

/* Crée un passeport de groupe (un code pour la classe). */
async function createGroup(req, res, next) {
  try {
    const data = await passportService.createGroup(req.body);
    return ApiResponse.created(res, data, 'Passeport de groupe créé');
  } catch (err) {
    return next(err);
  }
}

/* Crée un lot de passeports individuels. */
async function createBatch(req, res, next) {
  try {
    const data = await passportService.createBatch(req.body);
    return ApiResponse.created(res, data, 'Lot de passeports créé');
  } catch (err) {
    return next(err);
  }
}

/* Fiche publique par code. */
async function getByCode(req, res, next) {
  try {
    const data = await passportService.getByCode(req.params.code);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Valide un passage depuis le QR (industrie + visiteur). */
async function recordPassage(req, res, next) {
  try {
    const data = await passportService.recordPassage({
      visitorCode: req.body?.visitor_code || req.body?.code,
      industryCode: req.body?.industry_code,
    });
    const message = data.already ? 'Passage déjà enregistré' : 'Passage enregistré';
    return ApiResponse.success(res, data, message);
  } catch (err) {
    return next(err);
  }
}

/* Tamponne une visite (un site = un tampon, pour tout le groupe). */
async function scan(req, res, next) {
  try {
    const data = await passportService.scanVisit(req.body);
    return ApiResponse.created(res, data, 'Visite tamponnée');
  } catch (err) {
    return next(err);
  }
}

module.exports = { createGroup, createBatch, getByCode, recordPassage, scan };
