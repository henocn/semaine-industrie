'use strict';

const auditService = require('./audit.service');
const ApiResponse = require('../../utils/ApiResponse');

/* Liste les événements d'audit. */
async function list(req, res, next) {
  try {
    const data = await auditService.listEvents({ limit: req.query.limit });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };
