'use strict';

const { Router } = require('express');
const controller = require('./participation.controller');
const slots = require('./visitSlots.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createSchema, publicSchema, updateSchema } = require('./participation.validation');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');

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

const slotHits = new Map();

/* Limite les vérifications de code et réservations de départ par adresse (pas de recherche de codes au hasard). */
function limitSlots(req, res, next) {
  const ip = req.ip || 'inconnu';
  const now = Date.now();
  const recent = (slotHits.get(ip) || []).filter((at) => now - at < 10 * 60 * 1000);
  if (recent.length >= 30) {
    return next(ApiError.badRequest('Trop d’essais depuis cette adresse. Réessayez dans quelques minutes.'));
  }
  recent.push(now);
  slotHits.set(ip, recent);
  return next();
}

/* Refuse les formulaires publics fermés. Le backoffice peut toujours ajouter. */
function closedForms(req, res, next) {
  /* Particuliers : inscriptions ouvertes, fermables avec PARTICULIER_OPEN=false. */
  if (req.body?.kind === 'particulier' && !env.PARTICULIER_OPEN) {
    return next(ApiError.badRequest('Les inscriptions des particuliers aux visites d’usines sont closes.'));
  }
  /* Écoles / universités : inscriptions closes (le formulaire public envoie kind « ecole » ou rien). */
  if (!req.body?.kind || req.body.kind === 'ecole') {
    return next(ApiError.badRequest('Les inscriptions des écoles et universités aux visites d’industries sont closes.'));
  }
  /* Palais des Congrès : inscriptions closes. */
  if (req.body.kind === 'palais') {
    return next(ApiError.badRequest('Les inscriptions aux rendez-vous du Palais des Congrès sont closes.'));
  }
  /* Accréditations médias : demandes closes. */
  if (req.body.kind === 'media') {
    return next(ApiError.badRequest('Les demandes d’accréditation médias sont closes.'));
  }
  return next();
}

router.get('/public/capacity', controller.capacity);
router.get('/public/palais/:code', controller.palaisPass);
router.get('/public/media/:code', controller.mediaPass);
router.post('/public', closedForms, limitPublic, validate(publicSchema), controller.create);

/* Départs des visites : choix d'un particulier validé, avec son code de suivi. */
router.get('/public/visit-slots', slots.availability);
router.get('/public/visit-slots/:code', limitSlots, slots.lookup);
router.post('/public/visit-slots', limitSlots, slots.book);

router.use(authenticate, authorize('orga'));

router.get('/visit-slots', slots.planning);
router.put('/:id/visit-slot', slots.setSlot);
router.post('/palais/:code/checkin', controller.palaisCheckin);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validate(createSchema), controller.create);
router.patch('/:id', validate(updateSchema), controller.update);
router.post('/:id/approve', controller.approve);
router.post('/:id/notify', controller.notify);
router.post('/:id/reject', controller.reject);
router.delete('/:id', controller.remove);

module.exports = router;
