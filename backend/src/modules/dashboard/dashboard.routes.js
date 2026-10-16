'use strict';

/* Routes dashboard / bilan. */
const { Router } = require('express');
const controller = require('./dashboard.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = Router();

router.get('/bilan', controller.bilan);
router.get('/stats', authenticate, authorize('orga'), controller.stats);

module.exports = router;
