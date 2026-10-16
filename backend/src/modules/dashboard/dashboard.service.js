'use strict';

const { Op } = require('sequelize');
const {
  Organization,
  LabelRequest,
  VisitBooking,
  BusinessMeeting,
  PassportVisit,
  sequelize,
} = require('../../models');

/* Calcule les indicateurs agrégés de la semaine. */
async function getStats() {
  const [
    labelsApproved,
    labelsPending,
    labelsRejected,
    requestsTotal,
    orgsWithCoords,
    visitsBooked,
    youngVisitors,
    businessMeetings,
    passportScans,
    byRegionRows,
    bySectorRows,
    byTypeRows,
    recentLabels,
  ] = await Promise.all([
    Organization.count({ where: { label_status: 'approved', is_active: true } }),
    LabelRequest.count({ where: { status: 'pending' } }),
    LabelRequest.count({ where: { status: 'rejected' } }),
    LabelRequest.count(),
    Organization.count({
      where: {
        label_status: 'approved',
        is_active: true,
        lat: { [Op.ne]: null },
        lng: { [Op.ne]: null },
      },
    }),
    VisitBooking.count({ where: { status: { [Op.in]: ['pending', 'confirmed'] } } }),
    VisitBooking.sum('headcount', { where: { status: { [Op.in]: ['pending', 'confirmed'] } } }),
    BusinessMeeting.count({ where: { status: { [Op.in]: ['scheduled', 'done'] } } }),
    PassportVisit.count(),
    Organization.findAll({
      attributes: [
        'region',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { label_status: 'approved', is_active: true, region: { [Op.ne]: null } },
      group: ['region'],
      raw: true,
    }),
    Organization.findAll({
      attributes: [
        'sector',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { label_status: 'approved', is_active: true, sector: { [Op.ne]: null } },
      group: ['sector'],
      raw: true,
    }),
    Organization.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { label_status: 'approved', is_active: true },
      group: ['type'],
      raw: true,
    }),
    Organization.findAll({
      where: { label_status: 'approved', is_active: true },
      attributes: ['id', 'name', 'slug', 'label_code', 'city', 'region', 'type', 'labeled_at'],
      order: [['labeled_at', 'DESC']],
      limit: 12,
    }),
  ]);

  return {
    indicators: {
      labels_approved: labelsApproved,
      labels_pending: labelsPending,
      labels_rejected: labelsRejected,
      requests_total: requestsTotal,
      sites_on_map: orgsWithCoords,
      visits_booked: visitsBooked,
      young_visitors: Number(youngVisitors || 0),
      business_meetings: businessMeetings,
      passport_scans: passportScans,
    },
    by_region: byRegionRows.map((r) => ({ name: r.region, count: Number(r.count) })),
    by_sector: bySectorRows.map((r) => ({ name: r.sector, count: Number(r.count) })),
    by_type: byTypeRows.map((r) => ({ name: r.type, count: Number(r.count) })),
    recent_labels: recentLabels,
    updated_at: new Date().toISOString(),
  };
}

module.exports = { getStats };
