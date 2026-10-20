'use strict';

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

/* Nettoie la liste d'options (choix multiples). */
function cleanOptions(raw) {
  const list = Array.isArray(raw)
    ? raw.map((o) => String(o || '').trim()).filter(Boolean)
    : [];
  const unique = [...new Set(list)];
  if (unique.length < 2) {
    throw ApiError.badRequest('Au moins deux options sont requises');
  }
  if (unique.length > 12) {
    throw ApiError.badRequest('Maximum 12 options');
  }
  return unique;
}

/* Sérialise une question pour l'API. */
function toPublicQuestion(q) {
  return {
    id: q.id,
    key: q.key,
    label: q.label,
    kind: q.kind === 'choice' ? 'choice' : 'scale',
    options: q.kind === 'choice' && Array.isArray(q.options) ? q.options : null,
    sort_order: q.sort_order,
  };
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
  return rows.map(toPublicQuestion);
}

/* Liste toutes les questions (backoffice). */
async function listQuestionsAdmin() {
  const rows = await SurveyQuestion.findAll({
    order: [
      ['sort_order', 'ASC'],
      ['created_at', 'ASC'],
    ],
  });
  return rows.map((q) => ({
    ...toPublicQuestion(q),
    is_active: q.is_active,
  }));
}

/* Crée une question d'enquête. */
async function createQuestion({ label, kind = 'scale', options, sort_order }) {
  const text = String(label || '').trim();
  if (!text) throw ApiError.badRequest('Libellé requis');

  const qKind = kind === 'choice' ? 'choice' : 'scale';
  const opts = qKind === 'choice' ? cleanOptions(options) : null;

  let order = Number(sort_order);
  if (!Number.isFinite(order)) {
    const max = await SurveyQuestion.max('sort_order');
    order = (Number(max) || 0) + 1;
  }

  const row = await SurveyQuestion.create({
    key: slugKey(text),
    label: text,
    kind: qKind,
    options: opts,
    sort_order: order,
    is_active: true,
  });
  return toPublicQuestion(row);
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
  if (payload.kind != null) {
    row.kind = payload.kind === 'choice' ? 'choice' : 'scale';
  }
  if (payload.options !== undefined || payload.kind === 'choice') {
    if (row.kind === 'choice') {
      row.options = cleanOptions(payload.options != null ? payload.options : row.options);
    } else {
      row.options = null;
    }
  }
  if (row.kind === 'scale') row.options = null;

  if (payload.sort_order != null && Number.isFinite(Number(payload.sort_order))) {
    row.sort_order = Number(payload.sort_order);
  }
  await row.save();
  return toPublicQuestion(row);
}

/* Supprime une question. */
async function deleteQuestion(id) {
  const row = await SurveyQuestion.findByPk(id);
  if (!row) throw ApiError.notFound('Question introuvable');
  await row.destroy();
  return { id };
}

/* Réordonne les questions (drag and drop). */
async function reorderQuestions(orderedIds) {
  const ids = [...new Set((orderedIds || []).map(String))];
  if (!ids.length) throw ApiError.badRequest('Liste vide');

  const rows = await SurveyQuestion.findAll();
  if (rows.length !== ids.length) {
    throw ApiError.badRequest('La liste doit contenir toutes les questions');
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of ids) {
    if (!byId.has(id)) throw ApiError.badRequest('Identifiant inconnu');
  }

  await Promise.all(
    ids.map((id, index) => {
      const row = byId.get(id);
      row.sort_order = index + 1;
      return row.save();
    }),
  );

  return listQuestionsAdmin();
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
    const raw = answers?.[q.key];
    if (q.kind === 'choice') {
      const opts = Array.isArray(q.options) ? q.options : [];
      const val = String(raw ?? '').trim();
      if (!opts.includes(val)) {
        throw ApiError.badRequest(`Choix invalide pour « ${q.label} »`);
      }
      cleaned[q.key] = val;
    } else {
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 1 || v > 5) {
        throw ApiError.badRequest(`Réponse invalide pour « ${q.label} » (1 à 5)`);
      }
      cleaned[q.key] = v;
    }
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
  const choiceAgg = {};

  for (const q of questions) {
    if (q.kind === 'choice') {
      choiceAgg[q.key] = { before: {}, after: {} };
    } else {
      agg.before[q.key] = { sum: 0, n: 0 };
      agg.after[q.key] = { sum: 0, n: 0 };
    }
  }

  for (const row of rows) {
    const phase = row.phase;
    if (phase !== 'before' && phase !== 'after') continue;
    agg.counts[phase] += 1;
    const answers = row.answers || {};
    for (const q of questions) {
      if (q.kind === 'choice') {
        const val = String(answers[q.key] ?? '').trim();
        if (!val) continue;
        choiceAgg[q.key][phase][val] = (choiceAgg[q.key][phase][val] || 0) + 1;
      } else {
        const v = Number(answers[q.key]);
        if (Number.isFinite(v) && agg[phase][q.key]) {
          agg[phase][q.key].sum += v;
          agg[phase][q.key].n += 1;
        }
      }
    }
  }

  const averages = questions
    .filter((q) => q.kind !== 'choice')
    .map((q) => ({
      key: q.key,
      label: q.label,
      kind: 'scale',
      before: agg.before[q.key].n ? +(agg.before[q.key].sum / agg.before[q.key].n).toFixed(2) : null,
      after: agg.after[q.key].n ? +(agg.after[q.key].sum / agg.after[q.key].n).toFixed(2) : null,
    }));

  const choices = questions
    .filter((q) => q.kind === 'choice')
    .map((q) => ({
      key: q.key,
      label: q.label,
      kind: 'choice',
      options: Array.isArray(q.options) ? q.options : [],
      before: choiceAgg[q.key].before,
      after: choiceAgg[q.key].after,
    }));

  return {
    questions: questions.map((q) => ({
      key: q.key,
      label: q.label,
      kind: q.kind,
      is_active: q.is_active,
    })),
    counts: agg.counts,
    averages,
    choices,
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

module.exports = {
  getQuestions,
  listQuestionsAdmin,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  submit,
  getStats,
  listRecentResponses,
};
