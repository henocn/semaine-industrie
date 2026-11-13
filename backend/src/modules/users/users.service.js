'use strict';

const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { getPresenceMap, isOnline } = require('../../realtime/presence');

/* Sérialise un utilisateur (sans secret) + présence. */
function toUser(u, onlineMap) {
  const online = onlineMap
    ? Boolean(onlineMap[u.id])
    : isOnline(u.id);
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    is_active: u.is_active,
    last_login_at: u.last_login_at,
    last_seen_at: u.last_seen_at,
    online,
    created_at: u.created_at || u.createdAt,
  };
}

/* Rôles des comptes du back-office : scan ne fait que scanner les QR. */
const STAFF_ROLES = ['admin', 'simple', 'orga', 'scan'];

/* Rôle accepté à la création ou à la modification (simple par défaut). */
function staffRole(role) {
  return ['admin', 'scan'].includes(role) ? role : 'simple';
}

/* Liste les comptes staff (admin / simple / scan / orga legacy). */
async function listUsers() {
  const rows = await User.findAll({
    where: { role: { [Op.in]: STAFF_ROLES } },
    order: [
      ['role', 'ASC'],
      ['last_name', 'ASC'],
      ['first_name', 'ASC'],
    ],
  });
  const onlineMap = getPresenceMap();
  return rows.map((u) => toUser(u, onlineMap));
}

/* Crée un compte staff. */
async function createUser({ email, first_name, last_name, role, password }) {
  const normalized = String(email || '').trim().toLowerCase();
  const exists = await User.findOne({ where: { email: normalized } });
  if (exists) throw ApiError.conflict('Cet e-mail est déjà utilisé');

  const row = await User.create({
    email: normalized,
    first_name: String(first_name || '').trim(),
    last_name: String(last_name || '').trim(),
    role: staffRole(role),
    password_hash: await bcrypt.hash(password, 10),
    is_active: true,
  });
  return toUser(row);
}

/* Met à jour un compte (password vide = inchangé). */
async function updateUser(id, payload) {
  const row = await User.scope('withSecret').findByPk(id);
  if (!row) throw ApiError.notFound('Utilisateur introuvable');

  if (payload.first_name != null) row.first_name = String(payload.first_name).trim();
  if (payload.last_name != null) row.last_name = String(payload.last_name).trim();
  if (payload.role != null) {
    row.role = staffRole(payload.role);
  }
  if (payload.is_active != null) row.is_active = Boolean(payload.is_active);
  const pwd = payload.password != null ? String(payload.password) : '';
  if (pwd.trim()) {
    row.password_hash = await bcrypt.hash(pwd.trim(), 10);
  }
  await row.save();
  return toUser(row);
}

/* Supprime un compte (interdit de se supprimer soi-même). */
async function deleteUser(id, actorId) {
  if (String(id) === String(actorId)) {
    throw ApiError.badRequest('Vous ne pouvez pas supprimer votre propre compte');
  }
  const row = await User.findByPk(id);
  if (!row) throw ApiError.notFound('Utilisateur introuvable');
  if (!STAFF_ROLES.includes(row.role)) {
    throw ApiError.badRequest('Ce compte ne peut pas être supprimé ici');
  }
  await row.destroy();
  return { id };
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
