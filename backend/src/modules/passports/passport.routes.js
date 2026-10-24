'use strict';

const { Router } = require('express');
const controller = require('./passport.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { groupSchema, batchSchema, scanSchema, passageSchema } = require('./passport.validation');
const ApiError = require('../../utils/ApiError');

const router = Router();
const passageHits = new Map();

/* Limite les validations publiques par adresse. */
function limitPassage(req, res, next) {
  const ip = req.ip || 'inconnu';
  const now = Date.now();
  const recent = (passageHits.get(ip) || []).filter((at) => now - at < 10 * 60 * 1000);
  if (recent.length >= 40) {
    return next(ApiError.badRequest('Trop de tentatives. Réessayez plus tard.'));
  }
  recent.push(now);
  passageHits.set(ip, recent);
  return next();
}

router.post('/group', authenticate, authorize('orga'), validate(groupSchema), controller.createGroup);
router.post('/batch', authenticate, authorize('orga'), validate(batchSchema), controller.createBatch);
router.post('/scan', authenticate, authorize('orga', 'referent_entreprise'), validate(scanSchema), controller.scan);
router.post('/passage', limitPassage, validate(passageSchema), controller.recordPassage);
router.get('/:code', controller.getByCode);

module.exports = router;
