'use strict';

const path = require('path');
const fs = require('fs');
const { LiveQuestion, VoteOption, VoteBallot, Organization, sequelize } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { PRODUCTS_DIR } = require('../../middlewares/upload.middleware');

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

/* Efface le fichier image d'un produit, s'il est dans le dossier prévu. */
function removeProductImage(url) {
  if (!url || !String(url).startsWith('/uploads/products/')) return;
  const file = path.join(PRODUCTS_DIR, path.basename(url));
  fs.unlink(file, () => {});
}

/* Crée un produit en lice (titre, description, image). */
async function createVoteOption({ label, description, file }) {
  const title = String(label || '').trim();
  if (title.length < 2) throw ApiError.badRequest('Titre requis');
  return VoteOption.create({
    label: title.slice(0, 200),
    description: String(description || '').trim() || null,
    image_url: file ? `/uploads/products/${file.filename}` : null,
    organization_id: null,
    is_active: true,
  });
}

/* Met à jour un produit. Une nouvelle image remplace l'ancienne. */
async function updateVoteOption(id, { label, description, file }) {
  const row = await VoteOption.findByPk(id);
  if (!row) throw ApiError.notFound('Produit introuvable');
  if (label != null) {
    const title = String(label).trim();
    if (title.length < 2) throw ApiError.badRequest('Titre requis');
    row.label = title.slice(0, 200);
  }
  if (description != null) row.description = String(description).trim() || null;
  if (file) {
    removeProductImage(row.image_url);
    row.image_url = `/uploads/products/${file.filename}`;
  }
  await row.save();
  return row;
}

/* Retire un produit du vote. */
async function removeVoteOption(id) {
  const row = await VoteOption.findByPk(id);
  if (!row) throw ApiError.notFound('Produit introuvable');
  removeProductImage(row.image_url);
  await row.destroy();
  return { id };
}

/* Liste les produits en lice et leurs voix. */
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

/* Retire les anciennes options liées à une structure. Les produits saisis à la main restent. */
async function retireVoteOptionsForOrganization(org) {
  if (!org?.id) return;
  await VoteOption.update({ is_active: false }, { where: { organization_id: org.id } });
}

module.exports = {
  askQuestion,
  listQuestions,
  reviewQuestion,
  createVoteOption,
  updateVoteOption,
  removeVoteOption,
  listVoteResults,
  castVote,
  retireVoteOptionsForOrganization,
};
