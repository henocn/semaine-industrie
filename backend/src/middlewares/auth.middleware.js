'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');

/* Vérifie le JWT Bearer et attache req.user (rôle lu en base). */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Token manquant'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findByPk(payload.sub, {
      attributes: ['id', 'email', 'role', 'is_active', 'first_name', 'last_name'],
    });
    if (!user || !user.is_active) {
      return next(ApiError.unauthorized('Compte inactif'));
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session expirée'));
    }
    return next(ApiError.unauthorized('Token invalide'));
  }
}

/* Autorise uniquement certains rôles.
 * authorize('orga') accepte aussi admin et simple (staff backoffice). */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.forbidden('Rôle insuffisant'));
    }
    const allowed = new Set(roles);
    if (roles.includes('orga')) {
      allowed.add('admin');
      allowed.add('simple');
    }
    if (!allowed.has(req.user.role)) {
      return next(ApiError.forbidden('Rôle insuffisant'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
