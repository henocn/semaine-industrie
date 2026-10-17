'use strict';

const dashboardService = require('./dashboard.service');
const ApiResponse = require('../../utils/ApiResponse');

/* GET stats (orga dashboard). */
async function stats(req, res, next) {
  try {
    const data = await dashboardService.getStats();
    return ApiResponse.success(res, data);
  } catch (err) {
    return next(err);
  }
}

/* GET bilan (orga uniquement). */
async function bilan(req, res, next) {
  try {
    const full = await dashboardService.getStats();
    return ApiResponse.success(res, {
      indicators: {
        labels_approved: full.indicators.labels_approved,
        sites_on_map: full.indicators.sites_on_map,
        visits_booked: full.indicators.visits_booked,
        young_visitors: full.indicators.young_visitors,
        business_meetings: full.indicators.business_meetings,
      },
      by_region: full.by_region,
      by_sector: full.by_sector,
      by_type: full.by_type,
      recent_labels: full.recent_labels.map((o) => ({
        name: o.name,
        slug: o.slug,
        city: o.city,
        region: o.region,
        type: o.type,
        label_code: o.label_code,
      })),
      updated_at: full.updated_at,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { stats, bilan };
