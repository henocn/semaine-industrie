'use strict';

/* Routes du module label (demandes + fiches publiques). */
const { Router } = require('express');
const controller = require('./label.controller');
const validate = require('../../middlewares/validate.middleware');
const { createRequestSchema, reviewSchema } = require('./label.validation');

const router = Router();

// Public
router.post('/requests', validate(createRequestSchema), controller.createRequest);
router.get('/organizations/map', controller.listMap);
router.get('/organizations/:slug', controller.getPublicFiche);

// Orga (auth à brancher en 1.2 — ouvert temporairement pour développement)
router.get('/requests', controller.listRequests);
router.get('/requests/:id', controller.getRequest);
router.patch('/requests/:id/review', validate(reviewSchema), controller.reviewRequest);

module.exports = router;
