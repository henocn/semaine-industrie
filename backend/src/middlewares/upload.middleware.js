'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/labels');
const DOCS_DIR = path.join(__dirname, '../../uploads/docs');
const PRODUCTS_DIR = path.join(__dirname, '../../uploads/products');

/* Garantit les dossiers d'upload. */
for (const dir of [UPLOAD_DIR, DOCS_DIR, PRODUCTS_DIR]) {
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

/* Accepte PDF, Word ou images (kit label). */
function kitFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  const okMime = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ].includes(mime);
  const okExt = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  if (!okMime && !okExt) {
    return cb(new Error('Format kit invalide (PDF, Word ou image)'));
  }
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

const uploadKit = multer({
  storage: pdfStorage,
  fileFilter: kitFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

/* Middleware : exactement 3 images (champ gallery). */
const uploadGallery = uploadImages.array('gallery', 3);

/* Middleware : fichier kit à l'approbation (champ label_pdf, rétrocompat). */
const uploadLabelPdf = uploadKit.single('label_pdf');

/* Middleware : ajout d'un fichier au kit (champ kit_file). */
const uploadKitFile = uploadKit.single('kit_file');

/* Middleware : PDF programme officiel (champ programme_pdf). */
const uploadProgrammePdf = uploadPdf.single('programme_pdf');

/* Middleware : PDF ressource globale (champ file). */
const uploadResourcePdf = uploadPdf.single('file');

const productStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

/* Middleware : image d'un produit du coup de cœur (champ image). */
const uploadProductImage = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('image');

module.exports = {
  uploadGallery,
  uploadLabelPdf,
  uploadKitFile,
  uploadProgrammePdf,
  uploadResourcePdf,
  uploadProductImage,
  UPLOAD_DIR,
  DOCS_DIR,
  PRODUCTS_DIR,
};
