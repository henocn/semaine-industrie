'use strict';

const authService = require('./auth.service');
const ApiResponse = require('../../utils/ApiResponse');

/* POST /auth/login */
async function login(req, res, next) {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    return ApiResponse.success(res, data, 'Connexion réussie');
  } catch (err) {
    return next(err);
  }
}

/* POST /auth/refresh */
async function refresh(req, res, next) {
  try {
    const data = await authService.refresh(req.body.refresh_token);
    return ApiResponse.success(res, data, 'Token renouvelé');
  } catch (err) {
    return next(err);
  }
}

/* POST /auth/logout */
async function logout(req, res, next) {
  try {
    await authService.logout(req.body.refresh_token);
    return ApiResponse.success(res, null, 'Déconnexion');
  } catch (err) {
    return next(err);
  }
}

/* GET /auth/me */
async function me(req, res, next) {
  try {
    const data = await authService.me(req.user.id);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, refresh, logout, me };
