'use strict';

const usersService = require('./users.service');
const ApiResponse = require('../../utils/ApiResponse');
const { audit } = require('../../utils/audit');

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
    await audit(req, {
      action: 'create',
      entityType: 'user',
      entityId: data.id,
      summary: `Création utilisateur ${data.email} (${data.role})`,
    });
    return ApiResponse.created(res, data, 'Utilisateur créé');
  } catch (err) {
    return next(err);
  }
}

/* Met à jour un utilisateur. */
async function update(req, res, next) {
  try {
    const data = await usersService.updateUser(req.params.id, req.body);
    const pwdChanged = Boolean(String(req.body.password || '').trim());
    await audit(req, {
      action: 'update',
      entityType: 'user',
      entityId: data.id,
      summary: `Modification utilisateur ${data.email}${pwdChanged ? ' (mot de passe)' : ''}`,
      meta: { password_changed: pwdChanged, role: data.role, is_active: data.is_active },
    });
    return ApiResponse.success(res, data, 'Utilisateur mis à jour');
  } catch (err) {
    return next(err);
  }
}

/* Supprime un utilisateur. */
async function remove(req, res, next) {
  try {
    const data = await usersService.deleteUser(req.params.id, req.user.id);
    await audit(req, {
      action: 'delete',
      entityType: 'user',
      entityId: data.id,
      summary: `Suppression utilisateur ${data.id}`,
    });
    return ApiResponse.success(res, data, 'Utilisateur supprimé');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, create, update, remove };
