'use strict';

const usersService = require('./users.service');
const ApiResponse = require('../../utils/ApiResponse');

/* Liste les utilisateurs. */
async function list(req, res, next) {
  try {
    return ApiResponse.success(res, await usersService.listUsers());
  } catch (err) {
    return next(err);
  }
}

/* Crée un utilisateur. */
async function create(req, res, next) {
  try {
    const data = await usersService.createUser(req.body);
    return ApiResponse.created(res, data, 'Utilisateur créé');
  } catch (err) {
    return next(err);
  }
}

/* Met à jour un utilisateur. */
async function update(req, res, next) {
  try {
    const data = await usersService.updateUser(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Utilisateur mis à jour');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, update };
