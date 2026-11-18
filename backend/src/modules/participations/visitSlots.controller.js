'use strict';

const service = require('./visitSlots');
const ApiResponse = require('../../utils/ApiResponse');
const { audit } = require('../../utils/audit');
const { emitRealtime } = require('../../realtime/io');

/* Prévient le backoffice qu'un départ a changé : « book » quand un particulier choisit lui-même, « set » depuis le backoffice. */
function emitChange(action, data) {
  const slot = data.slot?.id ?? data.slot ?? null;
  emitRealtime(
    'visit-slot:changed',
    { action, id: data.id, name: data.name, slot, label: slot ? service.slotLabel(slot) : null },
    'orga',
  );
}

/* Départs et places restantes (public). */
async function availability(req, res, next) {
  try {
    return ApiResponse.success(res, await service.availability());
  } catch (err) {
    return next(err);
  }
}

/* Vérifie un code de suivi avant le choix du départ (public). */
async function lookup(req, res, next) {
  try {
    return ApiResponse.success(res, await service.lookup(req.params.code));
  } catch (err) {
    return next(err);
  }
}

/* Réserve un départ (public). */
async function book(req, res, next) {
  try {
    const { id, ...data } = await service.book(req.body?.code, req.body?.slot);
    if (!data.already) {
      await audit(req, {
        action: 'update',
        entityType: 'participation',
        entityId: id,
        summary: `Départ réservé par « ${data.name} » (${data.code}) : ${service.slotLabel(data.slot.id)}`,
      });
      emitChange('book', { id, ...data });
    }
    return ApiResponse.success(res, data, data.already ? 'Départ déjà réservé' : 'Départ réservé');
  } catch (err) {
    return next(err);
  }
}

/* Planning des départs avec les inscrits (backoffice). */
async function planning(req, res, next) {
  try {
    return ApiResponse.success(res, await service.planning());
  } catch (err) {
    return next(err);
  }
}

/* Change ou libère le départ d'un particulier (backoffice). */
async function setSlot(req, res, next) {
  try {
    const data = await service.setSlot(req.params.id, req.body?.slot || null);
    await audit(req, {
      action: 'update',
      entityType: 'participation',
      entityId: data.id,
      summary: data.slot
        ? `Départ de « ${data.name} » : ${service.slotLabel(data.slot)}`
        : `Départ de « ${data.name} » libéré`,
    });
    emitChange('set', data);
    return ApiResponse.success(res, data, data.slot ? 'Départ modifié' : 'Place libérée');
  } catch (err) {
    return next(err);
  }
}

/* Ouvre ou ferme le choix des créneaux d'un jour (cases des Paramètres du backoffice). */
async function setOpen(req, res, next) {
  try {
    const data = await service.setOpen(req.body?.day, req.body?.open === true, req.user);
    emitRealtime('visit-slot:changed', { action: 'open', open: data.open }, 'orga');
    return ApiResponse.success(res, data, 'Choix des créneaux mis à jour');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  setOpen,
  availability,
  lookup,
  book,
  planning,
  setSlot,
};
