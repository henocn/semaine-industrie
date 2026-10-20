'use strict';

/* Routes du module label (demandes + fiches publiques). */
const { Router } = require('express');
const controller = require('./label.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const {
  uploadGallery,
  uploadLabelPdf,
  uploadProgrammePdf,
} = require('../../middlewares/upload.middleware');
const {
  createRequestSchema,
  createOrgaRequestSchema,
  updateRequestSchema,
} = require('./label.validation');
const ApiError = require('../../utils/ApiError');

const router = Router();

/* Wrap multer pour renvoyer une erreur API propre. */
function withUpload(middleware, nextHandler) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return next(ApiError.badRequest(err.message || 'Upload impossible'));
      return nextHandler(req, res, next);
    });
  };
}

// Public
router.post('/upload-gallery', withUpload(uploadGallery, controller.uploadGallery));
router.post('/requests', validate(createRequestSchema), controller.createRequest);
router.post('/verify-code', controller.verifyCode);
router.get('/organizations', controller.listIndustries);
router.get('/organizations/map', controller.listMap);
router.get('/organizations/:slug', controller.getPublicFiche);

// Orga authentifié
router.get('/qr-batch', authenticate, authorize('orga'), controller.listQrBatch);
router.get('/requests', authenticate, authorize('orga'), controller.listRequests);
router.get(
  '/requests/:id/qr',
  authenticate,
  authorize('orga'),
  controller.getRequestQr,
);
router.post(
  '/requests/orga',
  authenticate,
  authorize('orga'),
  validate(createOrgaRequestSchema),
  controller.createRequestOrga,
);
router.get('/requests/:id', authenticate, authorize('orga'), controller.getRequest);
router.patch(
  '/requests/:id',
  authenticate,
  authorize('orga'),
  validate(updateRequestSchema),
  controller.updateRequest,
);
router.patch(
  '/requests/:id/label-pdf',
  authenticate,
  authorize('orga'),
  withUpload(uploadLabelPdf, controller.updateLabelPdf),
);
router.delete(
  '/requests/:id',
  authenticate,
  authorize('orga'),
  controller.deleteRequest,
);
router.patch(
  '/requests/:id/review',
  authenticate,
  authorize('orga'),
  withUpload(uploadLabelPdf, controller.reviewRequest),
);
router.post(
  '/programme-pdf',
  authenticate,
  authorize('orga'),
  withUpload(uploadProgrammePdf, controller.uploadProgramme),
);

module.exports = router;
