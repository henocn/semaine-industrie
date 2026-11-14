'use strict';

const crypto = require('crypto');
const { Router } = require('express');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const galleryService = require('./gallery.service');

const router = Router();
const WINDOW_MS = 60 * 1000;
const MAX_CHECKS = 120;
let windowStart = 0;
let windowCount = 0;

/* Réservé au serveur de la galerie : clé partagée dans l'en-tête x-gallery-key. */
function requireGalleryKey(req, res, next) {
  const expected = env.GALLERY_API_KEY;
  if (!expected) return next(new ApiError(503, 'GALLERY_DISABLED', 'Vérification galerie non configurée'));
  const given = String(req.get('x-gallery-key') || '');
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return next(ApiError.unauthorized('Clé galerie invalide'));
  return next();
}

/* Plafond global par minute, en plus de la limite côté galerie. */
function limitChecks(req, res, next) {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  if (windowCount > MAX_CHECKS) return next(new ApiError(429, 'TOO_MANY', 'Trop de vérifications, réessayez dans une minute'));
  return next();
}

/* GET /gallery/check/:code → { valid, reason?, kind? } */
router.get('/check/:code', requireGalleryKey, limitChecks, async (req, res, next) => {
  try {
    return ApiResponse.success(res, await galleryService.checkCode(req.params.code));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
