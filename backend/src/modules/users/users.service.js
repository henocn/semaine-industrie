'use strict';

const bcrypt = require('bcrypt');
const { User } = require('../../models');
const ApiError = require('../../utils/ApiError');

/* Sérialise un utilisateur (sans secret). */
function toUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    is_active: u.is_active,
    last_login_at: u.last_login_at,
    created_at: u.created_at || u.createdAt,
  };
}

/* Liste les comptes. */
async function listUsers() {
  const rows = await User.findAll({
    order: [
      ['role', 'ASC'],
      ['last_name', 'ASC'],
      ['first_name', 'ASC'],
    ],
  });
  return rows.map(toUser);
}

/* Crée un compte. */
async function createUser({ email, first_name, last_name, role, password }) {
  const normalized = String(email || '').trim().toLowerCase();
  const exists = await User.findOne({ where: { email: normalized } });
  if (exists) throw ApiError.conflict('Cet e-mail est déjà utilisé');

  const row = await User.create({
    email: normalized,
    first_name: String(first_name || '').trim(),
    last_name: String(last_name || '').trim(),
    role: role || 'orga',
    password_hash: await bcrypt.hash(password, 10),
    is_active: true,
  });
  return toUser(row);
}

/* Met à jour un compte. */
async function updateUser(id, payload) {
  const row = await User.scope('withSecret').findByPk(id);
  if (!row) throw ApiError.notFound('Utilisateur introuvable');

  if (payload.first_name != null) row.first_name = String(payload.first_name).trim();
  if (payload.last_name != null) row.last_name = String(payload.last_name).trim();
  if (payload.role != null) row.role = payload.role;
  if (payload.is_active != null) row.is_active = Boolean(payload.is_active);
  if (payload.password) {
    row.password_hash = await bcrypt.hash(payload.password, 10);
  }
  await row.save();
  return toUser(row);
}

module.exports = { listUsers, createUser, updateUser };
