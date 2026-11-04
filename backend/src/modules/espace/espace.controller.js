'use strict';

const espaceService = require('./espace.service');
const ApiResponse = require('../../utils/ApiResponse');

/* Mon espace : fiche et bilan pour un code de suivi. */
async function getByCode(req, res, next) {
  try {
    const data = await espaceService.getByCode(req.params.code);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getByCode };
