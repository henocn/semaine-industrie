'use strict';

const { Router } = require('express');
const controller = require('./passport.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { batchSchema, scanSchema } = require('./passport.validation');

const router = Router();

router.post('/batch', authenticate, authorize('orga'), validate(batchSchema), controller.createBatch);
router.post('/scan', authenticate, authorize('orga', 'referent_entreprise'), validate(scanSchema), controller.scan);
router.get('/:code', controller.getByCode);

module.exports = router;
