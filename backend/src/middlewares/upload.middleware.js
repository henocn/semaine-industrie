'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const UPLOAD_DIR = path.join(__dirname, '../../uploads/labels');

/* Garantit le dossier d'upload. */
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

/* Accepte uniquement images jpeg / png / webp. */
function fileFilter(_req, file, cb) {
  const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  if (!ok) return cb(new Error('Format image invalide (JPEG, PNG ou WebP)'));
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});

/* Middleware : exactement 3 images (champ gallery). */
const uploadGallery = upload.array('gallery', 3);

module.exports = { uploadGallery, UPLOAD_DIR };
