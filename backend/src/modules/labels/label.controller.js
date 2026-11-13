'use strict';

const labelService = require('./label.service');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { emitRealtime } = require('../../realtime/io');
const { audit } = require('../../utils/audit');

/* Sérialise un modèle Sequelize pour Socket.IO. */
function asJson(row) {
  if (!row) return row;
  return typeof row.toJSON === 'function' ? row.toJSON() : row;
}

/* Crée une demande de label. */
async function createRequest(req, res, next) {
  try {
    const data = await labelService.createRequest(req.body);
    emitRealtime('label:created', asJson(data), 'orga');
    return ApiResponse.created(res, data, 'Demande de label enregistrée');
  } catch (err) {
    return next(err);
  }
}

/* Crée une demande depuis le backoffice. */
async function createRequestOrga(req, res, next) {
  try {
    const data = await labelService.createRequestByOrga(req.body);
    emitRealtime('label:created', asJson(data), 'orga');
    await audit(req, {
      action: 'create',
      entityType: 'label_request',
      entityId: data.id,
      summary: `Ajout label ${data.structure_name}`,
    });
    return ApiResponse.created(res, data, 'Label ajouté');
  } catch (err) {
    return next(err);
  }
}

/* Liste les demandes (orga). */
async function listRequests(req, res, next) {
  try {
    const data = await labelService.listRequests({ status: req.query.status });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Détail d'une demande. */
async function getRequest(req, res, next) {
  try {
    const data = await labelService.getRequestById(req.params.id);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Modifie une demande (orga). */
async function updateRequest(req, res, next) {
  try {
    const data = await labelService.updateRequest(req.params.id, req.body);
    emitRealtime('label:updated', asJson(data), 'orga');
    await audit(req, {
      action: 'update',
      entityType: 'label_request',
      entityId: data.id,
      summary: `Modification label ${data.structure_name}`,
    });
    return ApiResponse.success(res, data, 'Demande mise à jour');
  } catch (err) {
    return next(err);
  }
}

/* Ajoute un fichier au kit après acceptation (ancien endpoint). */
async function updateLabelPdf(req, res, next) {
  try {
    if (!req.file) throw ApiError.badRequest('Fichier kit requis');
    const data = await labelService.addKitFile(req.params.id, req.file, req.body?.title);
    emitRealtime('label:updated', asJson(data), 'orga');
    return ApiResponse.success(res, data, 'Fichier ajouté au kit');
  } catch (err) {
    return next(err);
  }
}

/* Ajoute un fichier au kit. */
async function addKitFile(req, res, next) {
  try {
    if (!req.file) throw ApiError.badRequest('Fichier kit requis');
    const data = await labelService.addKitFile(req.params.id, req.file, req.body?.title);
    emitRealtime('label:updated', asJson(data), 'orga');
    return ApiResponse.success(res, data, 'Fichier ajouté au kit');
  } catch (err) {
    return next(err);
  }
}

/* Supprime un fichier du kit. */
async function removeKitFile(req, res, next) {
  try {
    const data = await labelService.removeKitFile(req.params.id, req.params.fileId);
    emitRealtime('label:updated', asJson(data), 'orga');
    return ApiResponse.success(res, data, 'Fichier retiré du kit');
  } catch (err) {
    return next(err);
  }
}

/* Supprime une demande (et désactive la fiche liée). */
async function deleteRequest(req, res, next) {
  try {
    const data = await labelService.deleteRequest(req.params.id);
    emitRealtime('label:deleted', data, 'orga');
    await audit(req, {
      action: 'delete',
      entityType: 'label_request',
      entityId: req.params.id,
      summary: `Suppression dossier label ${req.params.id}`,
    });
    return ApiResponse.success(res, data, 'Dossier supprimé');
  } catch (err) {
    return next(err);
  }
}

/* Approuve ou rejette une demande (multipart si PDF label). */
async function reviewRequest(req, res, next) {
  try {
    const status = String(req.body?.status || '').trim();
    const review_note = req.body?.review_note || null;
    let label_document_url = req.body?.label_document_url || null;

    if (req.file) {
      label_document_url = `/uploads/docs/${req.file.filename}`;
    }

    if (!['approved', 'rejected'].includes(status)) {
      throw ApiError.badRequest('status invalide');
    }

    const data = await labelService.reviewRequest(req.params.id, {
      status,
      review_note,
      label_document_url,
      kit_file: req.file || null,
    });
    emitRealtime('label:updated', asJson(data.request), 'orga');
    const name = data.request?.structure_name || req.params.id;
    await audit(req, {
      action: status === 'approved' ? 'approve' : 'reject',
      entityType: 'label_request',
      entityId: req.params.id,
      summary: `${status === 'approved' ? 'Acceptation' : 'Refus'} label ${name}`,
    });
    return ApiResponse.success(res, data, 'Demande traitée');
  } catch (err) {
    return next(err);
  }
}

/* Upload de la photo d'une demande entreprise. */
async function uploadGallery(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length !== 1) {
      throw ApiError.badRequest('Une photo est requise');
    }
    const urls = files.map((f) => `/uploads/labels/${f.filename}`);
    return ApiResponse.created(res, { urls }, 'Images enregistrées');
  } catch (err) {
    return next(err);
  }
}

/* Enregistre le PDF programme officiel. */
async function uploadProgramme(req, res, next) {
  try {
    if (!req.file) throw ApiError.badRequest('PDF programme requis');
    const path = `/uploads/docs/${req.file.filename}`;
    const data = await labelService.setProgrammePdfUrl(path);
    return ApiResponse.success(res, data, 'Programme PDF enregistré');
  } catch (err) {
    return next(err);
  }
}

/* Vérifie un code de suivi et renvoie les téléchargements. */
async function verifyCode(req, res, next) {
  try {
    const data = await labelService.verifyTrackingCode(req.body?.code);
    return ApiResponse.success(res, data, 'Code valide');
  } catch (err) {
    return next(err);
  }
}

/* Liste publique des industries labellisées. */
async function listIndustries(req, res, next) {
  try {
    const data = await labelService.listPublicIndustries();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Fiche publique par slug. */
async function getPublicFiche(req, res, next) {
  try {
    const data = await labelService.getPublicBySlug(req.params.slug);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Points pour la carte. */
async function listMap(req, res, next) {
  try {
    const data = await labelService.listMapPoints({
      region: req.query.region,
      sector: req.query.sector,
      type: req.query.type,
    });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* Lot de QR pour impression. */
async function listQrBatch(req, res, next) {
  try {
    const data = await labelService.listQrBatch();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* QR pour une demande acceptée. */
async function getRequestQr(req, res, next) {
  try {
    const data = await labelService.getQrForRequest(req.params.id);
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createRequest,
  createRequestOrga,
  listRequests,
  getRequest,
  updateRequest,
  updateLabelPdf,
  addKitFile,
  removeKitFile,
  deleteRequest,
  reviewRequest,
  uploadGallery,
  uploadProgramme,
  verifyCode,
  listIndustries,
  getPublicFiche,
  listMap,
  listQrBatch,
  getRequestQr,
};
