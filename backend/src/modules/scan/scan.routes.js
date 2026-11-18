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
  /* true : vérifie le QR sans rien enregistrer (étape avant le bouton « Entrer »). */
  check: Joi.boolean().default(false),
  /* true : la personne déjà scannée repart (le scanneur a répondu Oui). */
  again: Joi.boolean().default(false),
});
const palaisSchema = Joi.object({
  code: Joi.string().trim().max(40).required(),
  day: Joi.number().valid(...palais.DAY_NUMBERS).required(),
  check: Joi.boolean().default(false),
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

/* Retrouve le code d'une personne venue sans QR, par son numéro ou son e-mail. */
router.get('/contact', authorize('orga', 'scan'), handle(async (req, res) => {
  const mode = req.query.mode === 'palais' ? 'palais' : 'visite';
  return ApiResponse.success(res, await service.findByContact({ mode, query: String(req.query.q || '').slice(0, 120) }));
}));

router.post('/departure', authorize('orga', 'scan'), validate(departureSchema), handle(async (req, res) => {
  const { id, ...data } = await service.scanDeparture(req.body, req.user);
  if (data.checked) return ApiResponse.success(res, data, 'QR valide');
  /* Ce que le scanneur a accepté malgré l'alerte, pour le journal. */
  const notes = { no_slot: 'sans créneau', wrong_place: 'autre lieu de départ', wrong_day: 'autre jour' };
  const forced = (data.issues || []).map((key) => notes[key]).filter(Boolean);
  const suffix = forced.length ? ` (accepté : ${forced.join(', ')})` : '';
  if (data.already && data.again) {
    await audit(req, {
      action: 'update',
      entityType: 'participation',
      entityId: id,
      summary: `Départ repris à « ${data.here} » : « ${data.name} » (${data.code}), déjà parti de « ${data.point} »${suffix}`,
    });
    emitRealtime('participation:changed', { action: 'update', id, name: data.name, status: data.status, kind: data.kind }, 'orga');
    return ApiResponse.success(res, data, 'Départ repris');
  }
  if (!data.already) {
    await audit(req, {
      action: 'update',
      entityType: 'participation',
      entityId: id,
      summary: `Départ scanné à « ${data.point} » : « ${data.name} » (${data.code})${suffix}`,
    });
    emitRealtime('participation:changed', { action: 'update', id, name: data.name, status: data.status, kind: data.kind }, 'orga');
  }
  return ApiResponse.success(res, data, data.already ? 'Départ déjà enregistré' : 'Départ enregistré');
}));

router.post('/palais', authorize('orga', 'scan'), validate(palaisSchema), handle(async (req, res) => {
  const { id, ...data } = await service.scanPalais(req.body);
  if (data.checked) return ApiResponse.success(res, data, 'QR valide');
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

/* Paramètres des points de départ : admins seulement (onglet Paramètres). */
router.get('/settings', authorize('admin'), handle(async (req, res) => ApiResponse.success(res, await service.settings())));

router.put('/settings/schools/:id', authorize('admin'), validate(schoolSchema), handle(async (req, res) => {
  return ApiResponse.success(res, await service.setSchool(req.params.id, req.body.enabled));
}));

router.post('/settings/points', authorize('admin'), validate(customSchema), handle(async (req, res) => {
  return ApiResponse.created(res, await service.addCustom(req.body.name));
}));

router.delete('/settings/points/:id', authorize('admin'), handle(async (req, res) => {
  return ApiResponse.success(res, await service.removeCustom(req.params.id));
}));

module.exports = router;
