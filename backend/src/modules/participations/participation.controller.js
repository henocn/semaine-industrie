'use strict';

const service = require('./participation.service');
const { listSchema } = require('./participation.validation');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { audit } = require('../../utils/audit');
const { emitRealtime } = require('../../realtime/io');

/* Diffuse un changement de participation au backoffice. */
function emitParticipation(action, data) {
  emitRealtime(
    'participation:changed',
    {
      action,
      id: data?.id,
      name: data?.name,
      status: data?.status,
      kind: data?.kind,
    },
    'orga',
  );
}

/* Liste les participations. */
async function list(req, res, next) {
  try {
    const { error, value } = listSchema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) return next(ApiError.badRequest('Données invalides'));
    return ApiResponse.success(res, await service.list(value));
  } catch (err) {
    return next(err);
  }
}

/* Fiche avec QR. */
async function getOne(req, res, next) {
  try {
    return ApiResponse.success(res, await service.getById(req.params.id));
  } catch (err) {
    return next(err);
  }
}

/* Places restantes pour les particuliers (formulaire public). */
async function capacity(req, res, next) {
  try {
    return ApiResponse.success(res, await service.particulierCapacity());
  } catch (err) {
    return next(err);
  }
}

/* Inscription aux journées du Palais lue depuis le QR (public). */
async function palaisPass(req, res, next) {
  try {
    return ApiResponse.success(res, await service.palaisPass(req.params.code));
  } catch (err) {
    return next(err);
  }
}

/* Accréditation média lue depuis le QR (public). */
async function mediaPass(req, res, next) {
  try {
    return ApiResponse.success(res, await service.mediaPass(req.params.code));
  } catch (err) {
    return next(err);
  }
}

/* Enregistre l'entrée du jour au Palais (accueil connecté). */
async function palaisCheckin(req, res, next) {
  try {
    const { id, ...data } = await service.palaisCheckin(req.params.code);
    if (!data.already) {
      await audit(req, {
        action: 'update',
        entityType: 'participation',
        entityId: id,
        summary: `Entrée au Palais le ${data.today} novembre : « ${data.name} » (${data.code})`,
      });
      emitParticipation('update', { id, name: data.name, status: data.status, kind: 'palais' });
    }
    return ApiResponse.success(res, data, data.already ? 'Entrée déjà enregistrée' : 'Entrée enregistrée');
  } catch (err) {
    return next(err);
  }
}

/* Crée une participation. */
async function create(req, res, next) {
  try {
    const data = await service.create(req.body);
    await audit(req, {
      action: 'create',
      entityType: 'participation',
      entityId: data.id,
      summary: `Participation ${data.kind} « ${data.name} »`,
    });
    emitParticipation('create', data);
    return ApiResponse.created(res, data, 'Participation enregistrée');
  } catch (err) {
    return next(err);
  }
}

/* Met à jour une participation. */
async function update(req, res, next) {
  try {
    const data = await service.update(req.params.id, req.body);
    await audit(req, {
      action: 'update',
      entityType: 'participation',
      entityId: data.id,
      summary: `Participation « ${data.name} » mise à jour`,
    });
    emitParticipation('update', data);
    return ApiResponse.success(res, data, 'Participation mise à jour');
  } catch (err) {
    return next(err);
  }
}

/* Accepte et délivre le QR. */
async function approve(req, res, next) {
  try {
    const data = await service.approve(req.params.id);
    await audit(req, {
      action: 'approve',
      entityType: 'participation',
      entityId: data.id,
      summary: `QR participation « ${data.name} »`,
    });
    emitParticipation('approve', data);
    return ApiResponse.success(res, data, 'Participation acceptée');
  } catch (err) {
    return next(err);
  }
}

/* Refuse une participation. */
async function reject(req, res, next) {
  try {
    const data = await service.reject(req.params.id);
    await audit(req, {
      action: 'reject',
      entityType: 'participation',
      entityId: data.id,
      summary: `Participation « ${data.name} » refusée`,
    });
    emitParticipation('reject', data);
    return ApiResponse.success(res, data, 'Participation refusée');
  } catch (err) {
    return next(err);
  }
}

/* Supprime une participation. */
async function remove(req, res, next) {
  try {
    const data = await service.remove(req.params.id);
    await audit(req, {
      action: 'delete',
      entityType: 'participation',
      entityId: data.id,
      summary: 'Participation supprimée',
    });
    emitParticipation('delete', data);
    return ApiResponse.success(res, data, 'Participation supprimée');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  capacity,
  mediaPass,
  palaisPass,
  palaisCheckin,
  list,
  getOne,
  create,
  update,
  approve,
  reject,
  remove,
};
