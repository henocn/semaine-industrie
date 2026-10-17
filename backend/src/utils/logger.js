'use strict';

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;

/* Crée le dossier logs s'il n'existe pas. */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/* Chemin du fichier du jour. */
function logFilePath() {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `app-${day}.log`);
}

/* Formate une ligne de log. */
function formatLine(level, args) {
  const ts = new Date().toISOString();
  const msg = args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');
  return `${ts} [${level.toUpperCase()}] ${msg}`;
}

/* Écrit en console + fichier (hors SQL). */
function write(level, args) {
  if ((LEVELS[level] || 99) < MIN_LEVEL) return;
  const line = formatLine(level, args);
  try {
    ensureLogDir();
    fs.appendFileSync(logFilePath(), `${line}\n`, 'utf8');
  } catch {
    // ignore write failures
  }
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = {
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
};

module.exports = logger;
