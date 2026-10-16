'use strict';

const { LiveQuestion, VoteOption, VoteBallot, Organization, sequelize } = require('../../models');
const ApiError = require('../../utils/ApiError');

/* Dépose une question en salle. */
async function askQuestion({ session_key = 'forum', author_name, body }) {
  return LiveQuestion.create({
    session_key: session_key || 'forum',
    author_name: author_name || null,
    body,
    status: 'pending',
  });
}

/* Liste questions (orga ou publiques approuvées). */
async function listQuestions({ session_key, status, publicOnly = false } = {}) {
  const where = {};
  if (session_key) where.session_key = session_key;
  if (publicOnly) where.status = 'approved';
  else if (status) where.status = status;
  return LiveQuestion.findAll({ where, order: [['created_at', 'DESC']] });
}

/* Modère une question. */
async function reviewQuestion(id, status) {
  const q = await LiveQuestion.findByPk(id);
  if (!q) throw ApiError.notFound('Question introuvable');
  q.status = status;
  await q.save();
  return q;
}

/* Crée une option de vote. */
async function createVoteOption({ label, organization_id }) {
  return VoteOption.create({
    label,
    organization_id: organization_id || null,
    is_active: true,
  });
}

/* Options + scores. */
async function listVoteResults() {
  const options = await VoteOption.findAll({
    where: { is_active: true },
    include: [{ model: Organization, as: 'organization', attributes: ['name', 'slug'] }],
    order: [['created_at', 'ASC']],
  });

  const counts = await VoteBallot.findAll({
    attributes: [
      'option_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'votes'],
    ],
    group: ['option_id'],
    raw: true,
  });
  const map = Object.fromEntries(counts.map((c) => [c.option_id, Number(c.votes)]));

  return options.map((o) => ({
    ...o.toJSON(),
    votes: map[o.id] || 0,
  }));
}

/* Enregistre un vote (1 par voter_key). */
async function castVote({ option_id, voter_key }) {
  const option = await VoteOption.findOne({ where: { id: option_id, is_active: true } });
  if (!option) throw ApiError.notFound('Option introuvable');

  const existing = await VoteBallot.findOne({ where: { voter_key } });
  if (existing) throw ApiError.conflict('Vous avez déjà voté');

  await VoteBallot.create({ option_id, voter_key });
  return listVoteResults();
}

/* Seed options depuis labels si vide. */
async function ensureVoteOptionsFromLabels() {
  const count = await VoteOption.count();
  if (count > 0) return listVoteResults();

  const orgs = await Organization.findAll({
    where: { label_status: 'approved', is_active: true },
    limit: 20,
    order: [['name', 'ASC']],
  });
  for (const org of orgs) {
    await VoteOption.create({
      label: org.name,
      organization_id: org.id,
      is_active: true,
    });
  }
  return listVoteResults();
}

module.exports = {
  askQuestion,
  listQuestions,
  reviewQuestion,
  createVoteOption,
  listVoteResults,
  castVote,
  ensureVoteOptionsFromLabels,
};
