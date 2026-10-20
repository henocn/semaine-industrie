'use strict';

const { Router } = require('express');
const controller = require('./audit.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = Router();

router.get('/', authenticate, authorize('orga'), controller.overview);

module.exports = router;
