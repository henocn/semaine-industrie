'use strict';

/* Routes du module label (demandes + fiches publiques). */
const { Router } = require('express');
const controller = require('./label.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploadGallery } = require('../../middlewares/upload.middleware');
const { createRequestSchema, reviewSchema, updateRequestSchema } = require('./label.validation');

const router = Router();

// Public
router.post('/upload-gallery', (req, res, next) => {
  uploadGallery(req, res, (err) => {
    if (err) {
      const ApiError = require('../../utils/ApiError');
      return next(ApiError.badRequest(err.message || 'Upload impossible'));
    }
    return controller.uploadGallery(req, res, next);
  });
});
router.post('/requests', validate(createRequestSchema), controller.createRequest);
router.get('/organizations', controller.listIndustries);
router.get('/organizations/map', controller.listMap);
router.get('/organizations/:slug', controller.getPublicFiche);

// Orga authentifié
router.get('/qr-batch', authenticate, authorize('orga'), controller.listQrBatch);
router.get('/requests', authenticate, authorize('orga'), controller.listRequests);
router.get('/requests/:id', authenticate, authorize('orga'), controller.getRequest);
router.patch(
  '/requests/:id',
  authenticate,
  authorize('orga'),
  validate(updateRequestSchema),
  controller.updateRequest,
);
router.patch(
  '/requests/:id/review',
  authenticate,
  authorize('orga'),
  validate(reviewSchema),
  controller.reviewRequest,
);

module.exports = router;
