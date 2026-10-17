'use strict';

const surveyService = require('./survey.service');
const ApiResponse = require('../../utils/ApiResponse');
const { emitRealtime } = require('../../realtime/io');

async function questions(req, res, next) {
  try {
    return ApiResponse.success(res, surveyService.getQuestions());
  } catch (err) {
    return next(err);
  }
}

async function submit(req, res, next) {
  try {
    const data = await surveyService.submit(req.body);
    const stats = await surveyService.getStats();
    emitRealtime('survey:updated', stats, 'live');
    return ApiResponse.created(res, data, 'Réponses enregistrées');
  } catch (err) {
    return next(err);
  }
}

async function stats(req, res, next) {
  try {
    const data = await surveyService.getStats();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { questions, submit, stats };
