'use strict';

const { Router } = require('express');
const controller = require('./entry-resource.controller');
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

router.use(authenticate, authorize('orga'));
router.get('/', controller.list);
router.post('/', withUpload(uploadResource, controller.create));
router.delete('/:id', controller.remove);

module.exports = router;
