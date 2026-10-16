'use strict';

const bookingService = require('./booking.service');
const ApiResponse = require('../../utils/ApiResponse');

/* POST réservation (public ou enseignant). */
async function create(req, res, next) {
  try {
    const teacherId = req.user?.role === 'enseignant' ? req.user.id : null;
    const data = await bookingService.createBooking(req.body, teacherId);
    return ApiResponse.created(res, data, 'Visite réservée');
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

/* GET sites réservables. */
async function sites(req, res, next) {
  try {
    const data = await bookingService.listBookableSites();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, sites };
