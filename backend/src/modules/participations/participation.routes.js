'use strict';

const { Router } = require('express');
const controller = require('./participation.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createSchema, publicSchema, updateSchema } = require('./participation.validation');
const ApiError = require('../../utils/ApiError');

const router = Router();
const publicHits = new Map();

/* Limite les inscriptions publiques par adresse. */
function limitPublic(req, res, next) {
  const ip = req.ip || 'inconnu';
  const now = Date.now();
  const recent = (publicHits.get(ip) || []).filter((at) => now - at < 10 * 60 * 1000);
  if (recent.length >= 8) {
    return next(ApiError.badRequest('Trop d’inscriptions depuis cette adresse. Réessayez plus tard.'));
  }
  recent.push(now);
  publicHits.set(ip, recent);
  return next();
}

router.get('/public/capacity', controller.capacity);
router.post('/public', limitPublic, validate(publicSchema), controller.create);

router.use(authenticate, authorize('orga'));

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validate(createSchema), controller.create);
router.patch('/:id', validate(updateSchema), controller.update);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.delete('/:id', controller.remove);

module.exports = router;
