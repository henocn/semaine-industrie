'use strict';

const surveyService = require('./survey.service');
const ApiResponse = require('../../utils/ApiResponse');

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
