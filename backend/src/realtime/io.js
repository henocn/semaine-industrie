'use strict';

const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../utils/logger');

/** @type {import('socket.io').Server | null} */
let io = null;

/* Attache Socket.IO au serveur HTTP. */
function initRealtime(httpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.debug(`socket connected ${socket.id}`);
    socket.on('join', (room) => {
      if (room === 'live' || room === 'votes' || room === 'orga') {
        socket.join(room);
      }
    });
    socket.on('disconnect', () => {
      logger.debug(`socket disconnected ${socket.id}`);
    });
  });

  logger.info('Socket.IO ready');
  return io;
}

/* Diffuse un événement (no-op si IO pas prêt). */
function emitRealtime(event, payload, room) {
  if (!io) return;
  if (room) io.to(room).emit(event, payload);
  else io.emit(event, payload);
}

module.exports = { initRealtime, emitRealtime };
