'use strict';

const surveyService = require('./survey.service');
const ApiResponse = require('../../utils/ApiResponse');
const { emitRealtime } = require('../../realtime/io');
const { audit } = require('../../utils/audit');

/* Questions actives pour le formulaire public. */
async function questions(req, res, next) {
  try {
    return ApiResponse.success(res, await surveyService.getQuestions());
  } catch (err) {
    return next(err);
  }
}

/* Toutes les questions (orga). */
async function listAdmin(req, res, next) {
  try {
    return ApiResponse.success(res, await surveyService.listQuestionsAdmin());
  } catch (err) {
    return next(err);
  }
}

/* Crée une question. */
async function createQuestion(req, res, next) {
  try {
    const data = await surveyService.createQuestion(req.body);
    await audit(req, {
      action: 'create',
      entityType: 'survey_question',
      entityId: data.id,
      summary: `Création question sondage « ${data.label} »`,
    });
    emitRealtime('survey:changed', { action: 'create', id: data.id }, 'orga');
    return ApiResponse.created(res, data, 'Question créée');
  } catch (err) {
    return next(err);
  }
}

/* Met à jour une question. */
async function updateQuestion(req, res, next) {
  try {
    const data = await surveyService.updateQuestion(req.params.id, req.body);
    await audit(req, {
      action: 'update',
      entityType: 'survey_question',
      entityId: data.id,
      summary: `Modification question sondage « ${data.label} »`,
    });
    emitRealtime('survey:changed', { action: 'update', id: data.id }, 'orga');
    return ApiResponse.success(res, data, 'Question mise à jour');
  } catch (err) {
    return next(err);
  }
}

/* Supprime une question. */
async function deleteQuestion(req, res, next) {
  try {
    const data = await surveyService.deleteQuestion(req.params.id);
    await audit(req, {
      action: 'delete',
      entityType: 'survey_question',
      entityId: req.params.id,
      summary: `Suppression question sondage`,
    });
    emitRealtime('survey:changed', { action: 'delete', id: req.params.id }, 'orga');
    return ApiResponse.success(res, data, 'Question supprimée');
  } catch (err) {
    return next(err);
  }
}

/* Réordonne les questions (drag and drop). */
async function reorderQuestions(req, res, next) {
  try {
    const data = await surveyService.reorderQuestions(req.body.ordered_ids);
    await audit(req, {
      action: 'reorder',
      entityType: 'survey_question',
      entityId: null,
      summary: 'Réordonnancement des questions du sondage',
    });
    emitRealtime('survey:changed', { action: 'reorder' }, 'orga');
    return ApiResponse.success(res, data, 'Ordre mis à jour');
  } catch (err) {
    return next(err);
  }
}

/* Enregistre une réponse publique. */
async function submit(req, res, next) {
  try {
    const data = await surveyService.submit(req.body);
    const stats = await surveyService.getStats();
    emitRealtime('survey:updated', stats, 'live');
    emitRealtime('survey:updated', stats, 'orga');
    return ApiResponse.created(res, data, 'Réponses enregistrées');
  } catch (err) {
    return next(err);
  }
}

/* Enregistre une partie de jeu (public). */
async function submitGame(req, res, next) {
  try {
    const data = await surveyService.submitGameResult(req.body);
    emitRealtime('survey:updated', { game: data.game }, 'orga');
    return ApiResponse.created(res, { id: data.id }, 'Résultat enregistré');
  } catch (err) {
    return next(err);
  }
}

/* Stats des jeux (orga). */
async function gameStats(req, res, next) {
  try {
    return ApiResponse.success(res, await surveyService.getGameStats());
  } catch (err) {
    return next(err);
  }
}

/* Stats orga. */
async function stats(req, res, next) {
  try {
    const data = await surveyService.getStats();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Dernières réponses. */
async function recent(req, res, next) {
  try {
    const data = await surveyService.listRecentResponses(req.query.limit);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  questions,
  listAdmin,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  submit,
  submitGame,
  gameStats,
  stats,
  recent,
};
