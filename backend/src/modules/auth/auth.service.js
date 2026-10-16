'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../../models');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');

/* Hash un refresh token avant stockage. */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/* Génère access + refresh tokens pour un utilisateur. */
async function issueTokens(user) {
  const access_token = jwt.sign(
    { email: user.email, role: user.role },
    env.JWT_ACCESS_SECRET,
    { subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  );

  const refresh_token = crypto.randomBytes(48).toString('hex');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user_id: user.id,
    token_hash: hashToken(refresh_token),
    expires_at,
  });

  return {
    access_token,
    refresh_token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    },
  };
}

/* Authentifie email / mot de passe. */
async function login(email, password) {
  const user = await User.scope('withSecret').findOne({ where: { email: email.toLowerCase() } });
  if (!user || !user.is_active) {
    throw ApiError.unauthorized('Email ou mot de passe invalide');
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw ApiError.unauthorized('Email ou mot de passe invalide');
  }

  user.last_login_at = new Date();
  await user.save();

  return issueTokens(user);
}

/* Renouvelle l'access token via refresh token. */
async function refresh(refreshToken) {
  const row = await RefreshToken.findOne({
    where: { token_hash: hashToken(refreshToken), revoked: false },
  });
  if (!row || row.expires_at < new Date()) {
    throw ApiError.unauthorized('Refresh token invalide');
  }

  const user = await User.findByPk(row.user_id);
  if (!user || !user.is_active) {
    throw ApiError.unauthorized('Compte inactif');
  }

  row.revoked = true;
  await row.save();

  return issueTokens(user);
}

/* Révoque un refresh token (logout). */
async function logout(refreshToken) {
  if (!refreshToken) return;
  const row = await RefreshToken.findOne({
    where: { token_hash: hashToken(refreshToken), revoked: false },
  });
  if (row) {
    row.revoked = true;
    await row.save();
  }
}

/* Retourne le profil connecté. */
async function me(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  return user;
}

module.exports = { login, refresh, logout, me };
