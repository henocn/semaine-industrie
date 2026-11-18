'use strict';

const { Router } = require('express');
const controller = require('./resource.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploadResource } = require('../../middlewares/upload.middleware');
const ApiError = require('../../utils/ApiError');

const router = Router();

/* Enveloppe multer pour renvoyer une erreur API. */
function withUpload(middleware, nextHandler) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return next(ApiError.badRequest(err.message || 'Upload impossible'));
      return nextHandler(req, res, next);
    });
  };
}

router.get('/', controller.listPublic);
router.post(
  '/',
  authenticate,
  /* Ressources gérées dans Paramètres : admins seulement. */
  authorize('admin'),
  withUpload(uploadResource, controller.create),
);
router.patch('/:id/primary', authenticate, authorize('admin'), controller.setPrimary);
router.delete('/:id', authenticate, authorize('admin'), controller.remove);

module.exports = router;
