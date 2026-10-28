'use strict';

const bookingService = require('./booking.service');
const ApiResponse = require('../../utils/ApiResponse');
const { emitRealtime } = require('../../realtime/io');

/* Diffuse un changement de visite au backoffice. */
function emitBooking(action, data) {
  emitRealtime('booking:changed', { action, id: data?.id }, 'orga');
}

/* POST arrangement de visite (orga uniquement). */
async function create(req, res, next) {
  try {
    const data = await bookingService.createBooking(req.body);
    emitBooking('create', data);
    return ApiResponse.created(res, data, 'Visite arrangée');
  } catch (err) {
    return next(err);
  }
}

/* PATCH mise à jour d'une visite. */
async function update(req, res, next) {
  try {
    const data = await bookingService.updateBooking(req.params.id, req.body);
    emitBooking('update', data);
    return ApiResponse.success(res, data, 'Visite mise à jour');
  } catch (err) {
    return next(err);
  }
}

/* DELETE suppression d'une visite. */
async function remove(req, res, next) {
  try {
    const data = await bookingService.deleteBooking(req.params.id);
    emitBooking('delete', data);
    return ApiResponse.success(res, data, 'Visite supprimée');
  } catch (err) {
    return next(err);
  }
}

/* GET liste orga. */
async function list(req, res, next) {
  try {
    const data = await bookingService.listBookings({ status: req.query.status });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* GET sites / écoles labellisés. */
async function sites(req, res, next) {
  try {
    const data = await bookingService.listBookableSites({ type: req.query.type });
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, update, remove, list, sites };
