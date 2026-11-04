'use strict';

const { Router } = require('express');
const controller = require('./espace.controller');
const ApiError = require('../../utils/ApiError');

const router = Router();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_LOOKUPS = 30;
const hits = new Map();

/* Limite les recherches par adresse : le code seul donne accès à la fiche. */
function limitLookup(req, res, next) {
  const ip = req.ip || 'inconnu';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_LOOKUPS) {
    return next(ApiError.badRequest('Trop de tentatives. Réessayez dans quelques minutes.'));
  }
  recent.push(now);
  hits.set(ip, recent);
  return next();
}

router.get('/:code', limitLookup, controller.getByCode);

module.exports = router;
