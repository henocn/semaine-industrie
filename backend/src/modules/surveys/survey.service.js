'use strict';

const { SurveyResponse, Passport } = require('../../models');
const ApiError = require('../../utils/ApiError');

const QUESTIONS = [
  { key: 'interest', label: 'L’industrie m’intéresse comme orientation' },
  { key: 'knowledge', label: 'Je connais des usines / métiers locaux' },
  { key: 'women', label: 'Les femmes ont leur place dans l’industrie' },
  { key: 'local', label: 'Transformer localement renforce le pays' },
  { key: 'visit', label: 'Je souhaite revoir / travailler dans une usine' },
];

/* Retourne le questionnaire type. */
function getQuestions() {
  return QUESTIONS;
}

/* Enregistre une réponse before/after. */
async function submit({ passport_code, phase, answers, source = 'qr' }) {
  let passport_id = null;
  if (passport_code) {
    const p = await Passport.findOne({ where: { code: String(passport_code).toUpperCase() } });
    if (!p) throw ApiError.notFound('Passeport introuvable');
    passport_id = p.id;
  }

  const cleaned = {};
  for (const q of QUESTIONS) {
    const v = Number(answers?.[q.key]);
    if (!Number.isFinite(v) || v < 1 || v > 5) {
      throw ApiError.badRequest(`Réponse invalide pour ${q.key} (1 à 5)`);
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
  const rows = await SurveyResponse.findAll({ raw: true });
  const agg = { before: {}, after: {}, counts: { before: 0, after: 0 } };

  for (const q of QUESTIONS) {
    agg.before[q.key] = { sum: 0, n: 0 };
    agg.after[q.key] = { sum: 0, n: 0 };
  }

  for (const row of rows) {
    const phase = row.phase;
    agg.counts[phase] += 1;
    const answers = row.answers || {};
    for (const q of QUESTIONS) {
      const v = Number(answers[q.key]);
      if (Number.isFinite(v)) {
        agg[phase][q.key].sum += v;
        agg[phase][q.key].n += 1;
      }
    }
  }

  const averages = QUESTIONS.map((q) => ({
    key: q.key,
    label: q.label,
    before: agg.before[q.key].n ? +(agg.before[q.key].sum / agg.before[q.key].n).toFixed(2) : null,
    after: agg.after[q.key].n ? +(agg.after[q.key].sum / agg.after[q.key].n).toFixed(2) : null,
  }));

  return {
    questions: QUESTIONS,
    counts: agg.counts,
    averages,
    total: rows.length,
  };
}

module.exports = { getQuestions, submit, getStats };
