'use strict';

const auditService = require('./audit.service');
const ApiResponse = require('../../utils/ApiResponse');

/* Vue d'ensemble audit / logs. */
async function overview(req, res, next) {
  try {
    const data = await auditService.getAuditOverview({
      day: req.query.day,
      limit: req.query.limit,
    });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { overview };
