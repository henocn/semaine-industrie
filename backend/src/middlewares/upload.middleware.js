'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/labels');
const DOCS_DIR = path.join(__dirname, '../../uploads/docs');

/* Garantit les dossiers d'upload. */
for (const dir of [UPLOAD_DIR, DOCS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOCS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `${uuidv4()}${ext}`);
  },
});

/* Accepte uniquement images jpeg / png / webp. */
function imageFilter(_req, file, cb) {
  const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  if (!ok) return cb(new Error('Format image invalide (JPEG, PNG ou WebP)'));
  return cb(null, true);
}

/* Accepte uniquement les PDF. */
function pdfFilter(_req, file, cb) {
  const ok =
    file.mimetype === 'application/pdf' ||
    path.extname(file.originalname).toLowerCase() === '.pdf';
  if (!ok) return cb(new Error('Seul un fichier PDF est accepté'));
  return cb(null, true);
}

const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});

const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

/* Middleware : exactement 3 images (champ gallery). */
const uploadGallery = uploadImages.array('gallery', 3);

/* Middleware : PDF label à l'approbation (champ label_pdf). */
const uploadLabelPdf = uploadPdf.single('label_pdf');

/* Middleware : PDF programme officiel (champ programme_pdf). */
const uploadProgrammePdf = uploadPdf.single('programme_pdf');

module.exports = {
  uploadGallery,
  uploadLabelPdf,
  uploadProgrammePdf,
  UPLOAD_DIR,
  DOCS_DIR,
};
