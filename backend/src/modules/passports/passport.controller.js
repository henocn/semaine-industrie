'use strict';

const passportService = require('./passport.service');
const ApiResponse = require('../../utils/ApiResponse');

async function createBatch(req, res, next) {
  try {
    const data = await passportService.createBatch(req.body);
    return ApiResponse.created(res, data, 'Lot de passeports créé');
  } catch (err) {
    return next(err);
  }
}

async function getByCode(req, res, next) {
  try {
    const data = await passportService.getByCode(req.params.code);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function scan(req, res, next) {
  try {
    const data = await passportService.scanVisit(req.body);
    return ApiResponse.created(res, data, 'Visite tamponnée');
  } catch (err) {
    return next(err);
  }
}

module.exports = { createBatch, getByCode, scan };
