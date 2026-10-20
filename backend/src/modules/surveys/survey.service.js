'use strict';

const { Op } = require('sequelize');
const { SurveyResponse, SurveyQuestion, Passport } = require('../../models');
const ApiError = require('../../utils/ApiError');

/* Génère une clé technique unique à partir du libellé. */
function slugKey(label) {
  const base = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48) || 'question';
  return `${base}_${Date.now().toString(36).slice(-4)}`;
}

/* Liste les questions actives (formulaire public). */
async function getQuestions() {
  const rows = await SurveyQuestion.findAll({
    where: { is_active: true },
    order: [
      ['sort_order', 'ASC'],
      ['created_at', 'ASC'],
    ],
  });
  return rows.map((q) => ({
    id: q.id,
    key: q.key,
    label: q.label,
    sort_order: q.sort_order,
  }));
}

/* Liste toutes les questions (backoffice). */
async function listQuestionsAdmin() {
  return SurveyQuestion.findAll({
    order: [
      ['sort_order', 'ASC'],
      ['created_at', 'ASC'],
    ],
  });
}

/* Crée une question d'enquête. */
async function createQuestion({ label, sort_order }) {
  const text = String(label || '').trim();
  if (!text) throw ApiError.badRequest('Libellé requis');

  let order = Number(sort_order);
  if (!Number.isFinite(order)) {
    const max = await SurveyQuestion.max('sort_order');
    order = (Number(max) || 0) + 1;
  }

  return SurveyQuestion.create({
    key: slugKey(text),
    label: text,
    sort_order: order,
    is_active: true,
  });
}

/* Met à jour une question. */
async function updateQuestion(id, payload) {
  const row = await SurveyQuestion.findByPk(id);
  if (!row) throw ApiError.notFound('Question introuvable');

  if (payload.label != null) {
    const text = String(payload.label).trim();
    if (!text) throw ApiError.badRequest('Libellé requis');
    row.label = text;
  }
  if (payload.sort_order != null && Number.isFinite(Number(payload.sort_order))) {
    row.sort_order = Number(payload.sort_order);
  }
  if (payload.is_active != null) {
    row.is_active = Boolean(payload.is_active);
  }
  await row.save();
  return row;
}

/* Supprime une question. */
async function deleteQuestion(id) {
  const row = await SurveyQuestion.findByPk(id);
  if (!row) throw ApiError.notFound('Question introuvable');
  await row.destroy();
  return { id };
}

/* Enregistre une réponse before/after. */
async function submit({ passport_code, phase, answers, source = 'qr' }) {
  const questions = await SurveyQuestion.findAll({
    where: { is_active: true },
    order: [['sort_order', 'ASC']],
  });
  if (!questions.length) {
    throw ApiError.badRequest('Aucune question active pour le moment');
  }

  let passport_id = null;
  if (passport_code) {
    const p = await Passport.findOne({ where: { code: String(passport_code).toUpperCase() } });
    if (!p) throw ApiError.notFound('Passeport introuvable');
    passport_id = p.id;
  }

  const cleaned = {};
  for (const q of questions) {
    const v = Number(answers?.[q.key]);
    if (!Number.isFinite(v) || v < 1 || v > 5) {
      throw ApiError.badRequest(`Réponse invalide pour « ${q.label} » (1 à 5)`);
    }
    cleaned[q.key] = v;
  }

  return SurveyResponse.create({
    passport_id,
    phase,
    answers: cleaned,
    source: source === 'paper' ? 'paper' : 'qr',
  });
}

/* Agrégats avant / après. */
async function getStats() {
  const questions = await SurveyQuestion.findAll({
    order: [
      ['sort_order', 'ASC'],
      ['created_at', 'ASC'],
    ],
  });
  const rows = await SurveyResponse.findAll({ raw: true });
  const agg = { before: {}, after: {}, counts: { before: 0, after: 0 } };

  for (const q of questions) {
    agg.before[q.key] = { sum: 0, n: 0 };
    agg.after[q.key] = { sum: 0, n: 0 };
  }

  for (const row of rows) {
    const phase = row.phase;
    if (phase !== 'before' && phase !== 'after') continue;
    agg.counts[phase] += 1;
    const answers = row.answers || {};
    for (const q of questions) {
      const v = Number(answers[q.key]);
      if (Number.isFinite(v)) {
        agg[phase][q.key].sum += v;
        agg[phase][q.key].n += 1;
      }
    }
  }

  const averages = questions.map((q) => ({
    key: q.key,
    label: q.label,
    before: agg.before[q.key].n ? +(agg.before[q.key].sum / agg.before[q.key].n).toFixed(2) : null,
    after: agg.after[q.key].n ? +(agg.after[q.key].sum / agg.after[q.key].n).toFixed(2) : null,
  }));

  return {
    questions: questions.map((q) => ({ key: q.key, label: q.label, is_active: q.is_active })),
    counts: agg.counts,
    averages,
    total: rows.length,
  };
}

/* Dernières réponses (aperçu backoffice). */
async function listRecentResponses(limit = 30) {
  const n = Math.min(Math.max(Number(limit) || 30, 1), 100);
  return SurveyResponse.findAll({
    order: [['created_at', 'DESC']],
    limit: n,
    attributes: ['id', 'phase', 'answers', 'source', 'created_at'],
  });
}

/* Réordonne deux questions (swap sort_order). */
async function moveQuestion(id, direction) {
  const row = await SurveyQuestion.findByPk(id);
  if (!row) throw ApiError.notFound('Question introuvable');

  const sibling = await SurveyQuestion.findOne({
    where:
      direction === 'up'
        ? { sort_order: { [Op.lt]: row.sort_order } }
        : { sort_order: { [Op.gt]: row.sort_order } },
    order: [['sort_order', direction === 'up' ? 'DESC' : 'ASC']],
  });
  if (!sibling) return row;

  const tmp = row.sort_order;
  row.sort_order = sibling.sort_order;
  sibling.sort_order = tmp;
  await Promise.all([row.save(), sibling.save()]);
  return row;
}

module.exports = {
  getQuestions,
  listQuestionsAdmin,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  moveQuestion,
  submit,
  getStats,
  listRecentResponses,
};
