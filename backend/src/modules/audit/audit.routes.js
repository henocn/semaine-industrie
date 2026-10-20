'use strict';

const { Router } = require('express');
const controller = require('./audit.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = Router();

/* Réservé aux admins. */
router.get('/', authenticate, authorize('admin'), controller.list);

module.exports = router;
