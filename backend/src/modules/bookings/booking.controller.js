'use strict';

const bookingService = require('./booking.service');
const ApiResponse = require('../../utils/ApiResponse');

/* POST arrangement de visite (orga uniquement). */
async function create(req, res, next) {
  try {
    const data = await bookingService.createBooking(req.body);
    return ApiResponse.created(res, data, 'Visite arrangée');
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

module.exports = { create, list, sites };
