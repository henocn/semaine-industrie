'use strict';

const fs = require('fs');
const path = require('path');
const ApiError = require('../../utils/ApiError');

const LOG_DIR = path.join(__dirname, '../../../logs');

/* Liste les fichiers de logs disponibles. */
function listLogFiles() {
  if (!fs.existsSync(LOG_DIR)) return [];
  return fs
    .readdirSync(LOG_DIR)
    .filter((name) => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(name))
    .sort()
    .reverse()
    .map((name) => {
      const full = path.join(LOG_DIR, name);
      const stat = fs.statSync(full);
      return {
        name,
        day: name.replace(/^app-|\.log$/g, ''),
        size: stat.size,
        updated_at: stat.mtime.toISOString(),
      };
    });
}

/* Lit les dernières lignes d'un fichier de log. */
function readLogTail(day, limit = 200) {
  const safeDay = String(day || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDay)) {
    throw ApiError.badRequest('Date invalide');
  }
  const file = path.join(LOG_DIR, `app-${safeDay}.log`);
  if (!fs.existsSync(file)) {
    throw ApiError.notFound('Aucun log pour cette date');
  }

  const n = Math.min(Math.max(Number(limit) || 200, 20), 1000);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const slice = lines.slice(-n);

  return {
    day: safeDay,
    total_lines: lines.length,
    returned: slice.length,
    lines: slice,
  };
}

/* Aperçu audit : fichiers + queue du jour (ou le plus récent). */
async function getAuditOverview({ day, limit } = {}) {
  const files = listLogFiles();
  const target = day || files[0]?.day || new Date().toISOString().slice(0, 10);
  let tail = null;
  try {
    tail = readLogTail(target, limit);
  } catch {
    tail = { day: target, total_lines: 0, returned: 0, lines: [] };
  }
  return { files, current: tail };
}

module.exports = { listLogFiles, readLogTail, getAuditOverview };
