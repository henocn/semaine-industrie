'use strict';

const businessService = require('./business.service');
const ApiResponse = require('../../utils/ApiResponse');
const { audit } = require('../../utils/audit');

/* Inscription publique. */
async function register(req, res, next) {
  try {
    const data = await businessService.register(req.body);
    return ApiResponse.created(res, data, 'Inscription enregistrée');
  } catch (err) {
    return next(err);
  }
}

/* Ajout manuel orga. */
async function createParticipant(req, res, next) {
  try {
    const data = await businessService.createByOrga(req.body);
    return ApiResponse.created(res, data, 'Participant ajouté');
  } catch (err) {
    return next(err);
  }
}

async function listParticipants(req, res, next) {
  try {
    const data = await businessService.listParticipants({
      status: req.query.status,
      kind: req.query.kind,
    });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function reviewParticipant(req, res, next) {
  try {
    const data = await businessService.reviewParticipant(req.params.id, req.body.status);
    await audit(req, {
      action: req.body.status === 'approved' ? 'approve' : 'reject',
      entityType: 'business_participant',
      entityId: data.id,
      summary: `Participant B2B « ${data.contact_name || data.organization_name || data.id} » ${
        req.body.status === 'approved' ? 'accepté' : 'refusé'
      }`,
    });
    return ApiResponse.success(res, data, 'Participant traité');
  } catch (err) {
    return next(err);
  }
}

/* Modifie un participant. */
async function updateParticipant(req, res, next) {
  try {
    const data = await businessService.updateParticipant(req.params.id, req.body);
    await audit(req, {
      action: 'update',
      entityType: 'business_participant',
      entityId: data.id,
      summary: `Participant B2B « ${data.contact_name || data.organization_name || data.id} » mis à jour`,
    });
    return ApiResponse.success(res, data, 'Participant mis à jour');
  } catch (err) {
    return next(err);
  }
}

/* Supprime un participant (sans rendez-vous). */
async function removeParticipant(req, res, next) {
  try {
    const data = await businessService.removeParticipant(req.params.id);
    await audit(req, {
      action: 'delete',
      entityType: 'business_participant',
      entityId: data.id,
      summary: `Participant B2B « ${data.label} » supprimé`,
    });
    return ApiResponse.success(res, { id: data.id }, 'Participant supprimé');
  } catch (err) {
    return next(err);
  }
}

async function createMeeting(req, res, next) {
  try {
    const data = await businessService.createMeeting(req.body);
    return ApiResponse.created(res, data, 'Rendez-vous créé');
  } catch (err) {
    return next(err);
  }
}

async function listMeetings(req, res, next) {
  try {
    const data = await businessService.listMeetings({ status: req.query.status });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function saveContactNote(req, res, next) {
  try {
    const data = await businessService.saveContactNote(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Fiche contact enregistrée');
  } catch (err) {
    return next(err);
  }
}

/* Reporte un rendez-vous. */
async function rescheduleMeeting(req, res, next) {
  try {
    const data = await businessService.rescheduleMeeting(req.params.id, req.body);
    return ApiResponse.success(res, data, 'Rendez-vous reporté');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  createParticipant,
  listParticipants,
  updateParticipant,
  removeParticipant,
  reviewParticipant,
  createMeeting,
  rescheduleMeeting,
  listMeetings,
  saveContactNote,
};
