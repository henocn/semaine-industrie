'use strict';

const { Router } = require('express');
const Joi = require('joi');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const ApiResponse = require('../../utils/ApiResponse');
const { audit } = require('../../utils/audit');
const { emitRealtime } = require('../../realtime/io');
const service = require('./scan.service');
const palais = require('../participations/palais');

const router = Router();

const departureSchema = Joi.object({
  code: Joi.string().trim().max(40).required(),
  point_id: Joi.string().guid().required(),
});
const palaisSchema = Joi.object({
  code: Joi.string().trim().max(40).required(),
  day: Joi.number().valid(...palais.DAY_NUMBERS).required(),
});
const schoolSchema = Joi.object({ enabled: Joi.boolean().required() });
const customSchema = Joi.object({ name: Joi.string().trim().min(2).max(200).required() });

/* Enveloppe async : erreurs vers le middleware d'erreur. */
const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (err) {
    return next(err);
  }
};

router.use(authenticate);

/* Scan : tous les comptes du back-office, y compris le rôle scan. */
router.get('/points', authorize('orga', 'scan'), handle(async (req, res) => ApiResponse.success(res, await service.listPoints())));

router.post('/departure', authorize('orga', 'scan'), validate(departureSchema), handle(async (req, res) => {
  const { id, ...data } = await service.scanDeparture(req.body, req.user);
  if (!data.already) {
    await audit(req, {
      action: 'update',
      entityType: 'participation',
      entityId: id,
      summary: `Départ scanné à « ${data.point} » : « ${data.name} » (${data.code})`,
    });
    emitRealtime('participation:changed', { action: 'update', id, name: data.name, status: data.status, kind: data.kind }, 'orga');
  }
  return ApiResponse.success(res, data, data.already ? 'Départ déjà enregistré' : 'Départ enregistré');
}));

router.post('/palais', authorize('orga', 'scan'), validate(palaisSchema), handle(async (req, res) => {
  const { id, ...data } = await service.scanPalais(req.body);
  if (!data.already) {
    await audit(req, {
      action: 'update',
      entityType: 'participation',
      entityId: id,
      summary: `Entrée au Palais le ${data.today} novembre : « ${data.name} » (${data.code})`,
    });
    emitRealtime('participation:changed', { action: 'update', id, name: data.name, status: data.status, kind: 'palais' }, 'orga');
  }
  return ApiResponse.success(res, data, data.already ? 'Entrée déjà enregistrée' : 'Entrée enregistrée');
}));

/* Paramètres des points de départ : comptes admin et simple seulement. */
router.get('/settings', authorize('orga'), handle(async (req, res) => ApiResponse.success(res, await service.settings())));

router.put('/settings/schools/:id', authorize('orga'), validate(schoolSchema), handle(async (req, res) => {
  return ApiResponse.success(res, await service.setSchool(req.params.id, req.body.enabled));
}));

router.post('/settings/points', authorize('orga'), validate(customSchema), handle(async (req, res) => {
  return ApiResponse.created(res, await service.addCustom(req.body.name));
}));

router.delete('/settings/points/:id', authorize('orga'), handle(async (req, res) => {
  return ApiResponse.success(res, await service.removeCustom(req.params.id));
}));

module.exports = router;
