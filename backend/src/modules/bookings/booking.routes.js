'use strict';

/* Routes de réservation de visites. */
const { Router } = require('express');
const controller = require('./booking.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createBookingSchema } = require('./booking.validation');

const router = Router();

router.get('/sites', controller.sites);
router.post('/', validate(createBookingSchema), controller.create);
router.get('/', authenticate, authorize('orga'), controller.list);

module.exports = router;
