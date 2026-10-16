'use strict';

/* Routes du module label (demandes + fiches publiques). */
const { Router } = require('express');
const controller = require('./label.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createRequestSchema, reviewSchema } = require('./label.validation');

const router = Router();

// Public
router.post('/requests', validate(createRequestSchema), controller.createRequest);
router.get('/organizations/map', controller.listMap);
router.get('/organizations/:slug', controller.getPublicFiche);

// Orga authentifié
router.get('/requests', authenticate, authorize('orga'), controller.listRequests);
router.get('/requests/:id', authenticate, authorize('orga'), controller.getRequest);
router.patch(
  '/requests/:id/review',
  authenticate,
  authorize('orga'),
  validate(reviewSchema),
  controller.reviewRequest,
);

module.exports = router;
