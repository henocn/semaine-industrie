'use strict';

/* Route de santé pour vérifier que l'API répond. */
const { Router } = require('express');
const ApiResponse = require('../../utils/ApiResponse');

const router = Router();

router.get('/', (req, res) => {
  return ApiResponse.success(res, {
    service: 'semaine-industrie-api',
    status: 'ok',
    time: new Date().toISOString(),
  });
});

module.exports = router;
