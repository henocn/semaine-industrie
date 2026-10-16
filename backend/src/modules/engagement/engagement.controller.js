'use strict';

const engagementService = require('./engagement.service');
const ApiResponse = require('../../utils/ApiResponse');

async function ask(req, res, next) {
  try {
    const data = await engagementService.askQuestion(req.body);
    return ApiResponse.created(res, data, 'Question envoyée');
  } catch (err) {
    return next(err);
  }
}

async function listQuestions(req, res, next) {
  try {
    const publicOnly = req.query.public === '1';
    const data = await engagementService.listQuestions({
      session_key: req.query.session_key,
      status: req.query.status,
      publicOnly,
    });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function reviewQuestion(req, res, next) {
  try {
    const data = await engagementService.reviewQuestion(req.params.id, req.body.status);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function voteResults(req, res, next) {
  try {
    const data = await engagementService.ensureVoteOptionsFromLabels();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

async function castVote(req, res, next) {
  try {
    const data = await engagementService.castVote(req.body);
    return ApiResponse.success(res, data, 'Vote enregistré');
  } catch (err) {
    return next(err);
  }
}

async function createOption(req, res, next) {
  try {
    const data = await engagementService.createVoteOption(req.body);
    return ApiResponse.created(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  ask,
  listQuestions,
  reviewQuestion,
  voteResults,
  castVote,
  createOption,
};
