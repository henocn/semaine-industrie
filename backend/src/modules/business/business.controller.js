'use strict';

const businessService = require('./business.service');
const ApiResponse = require('../../utils/ApiResponse');

async function register(req, res, next) {
  try {
    const data = await businessService.register(req.body);
    return ApiResponse.created(res, data, 'Inscription enregistrée');
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
    return ApiResponse.success(res, data, 'Participant traité');
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
  listParticipants,
  reviewParticipant,
  createMeeting,
  rescheduleMeeting,
  listMeetings,
  saveContactNote,
};
