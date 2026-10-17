'use strict';

/* Routes de réservation de visites (arrangement orga). */
const { Router } = require('express');
const controller = require('./booking.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createBookingSchema } = require('./booking.validation');

const router = Router();

router.get('/sites', authenticate, authorize('orga'), controller.sites);
router.post('/', authenticate, authorize('orga'), validate(createBookingSchema), controller.create);
router.get('/', authenticate, authorize('orga'), controller.list);

module.exports = router;
