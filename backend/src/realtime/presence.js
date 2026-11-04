'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const logger = require('../utils/logger');

/** @type {Map<string, Set<string>>} userId -> socket ids */
const socketsByUser = new Map();

/** @type {Map<string, string>} socketId -> userId */
const userBySocket = new Map();

/* Indique si un user a au moins un socket. */
function isOnline(userId) {
  const set = socketsByUser.get(String(userId));
  return Boolean(set && set.size > 0);
}

/* Snapshot présence pour l'API / sockets. */
function getPresenceMap() {
  const online = {};
  for (const [userId, set] of socketsByUser.entries()) {
    if (set.size > 0) online[userId] = true;
  }
  return online;
}

/* Persiste last_seen_at. */
async function touchLastSeen(userId) {
  try {
    await User.update({ last_seen_at: new Date() }, { where: { id: userId } });
  } catch (err) {
    logger.debug('[presence] last_seen failed', err.message);
  }
}

/* Marque un socket comme appartenant à un user. */
async function bindSocket(socket, userId) {
  const uid = String(userId);
  const prev = userBySocket.get(socket.id);
  if (prev && prev !== uid) {
    await unbindSocket(socket);
  }

  userBySocket.set(socket.id, uid);
  let set = socketsByUser.get(uid);
  if (!set) {
    set = new Set();
    socketsByUser.set(uid, set);
  }
  const wasOffline = set.size === 0;
  set.add(socket.id);
  await touchLastSeen(uid);
  return wasOffline;
}

/* Retire le socket ; renvoie true si le user passe hors ligne. */
async function unbindSocket(socket) {
  const uid = userBySocket.get(socket.id);
  userBySocket.delete(socket.id);
  if (!uid) return false;

  const set = socketsByUser.get(uid);
  if (!set) return false;
  set.delete(socket.id);
  if (set.size === 0) {
    socketsByUser.delete(uid);
    await touchLastSeen(uid);
    return true;
  }
  return false;
}

/* Diffuse l'état présence à la salle orga. */
function broadcastPresence(io) {
  if (!io) return;
  io.to('orga').emit('presence:update', { online: getPresenceMap() });
}

/* Branche les handlers présence sur un socket. */
function attachPresenceHandlers(io, socket) {
  socket.on('presence:auth', async (payload) => {
    try {
      const token = payload?.token;
      if (!token) return;
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findByPk(decoded.sub, {
        attributes: ['id', 'role', 'is_active'],
      });
      if (!user || !user.is_active) return;
      if (!['admin', 'simple', 'orga'].includes(user.role)) return;

      await bindSocket(socket, user.id);
      socket.join('orga');
      /* Les conversations du bot sont réservées aux admins. */
      if (user.role === 'admin') socket.join('admin');
      broadcastPresence(io);
    } catch (err) {
      logger.debug('[presence] auth failed', err.message);
    }
  });

  socket.on('disconnect', async () => {
    const wentOffline = await unbindSocket(socket);
    if (wentOffline) broadcastPresence(io);
  });
}

module.exports = {
  attachPresenceHandlers,
  getPresenceMap,
  isOnline,
  broadcastPresence,
};
