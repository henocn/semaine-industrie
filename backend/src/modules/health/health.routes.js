'use strict';

/* Route de santé pour vérifier que l'API répond. */
const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'semaine-industrie-api',
      status: 'ok',
      time: new Date().toISOString(),
    },
  });
});

module.exports = router;
