'use strict';

const { Op } = require('sequelize');
const { VisitBooking, Organization } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { notifyN8n } = require('../../utils/n8n');

/* Crée une réservation si la capacité le permet. */
async function createBooking(payload, teacherUserId = null) {
  const org = await Organization.findOne({
    where: {
      id: payload.organization_id,
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!org) throw ApiError.notFound('Site introuvable ou non labellisé');

  const slots = Array.isArray(org.visit_slots) ? org.visit_slots : [];
  const slotOk = slots.some(
    (s) => s.day === payload.visit_day && s.start === payload.visit_start && s.end === payload.visit_end,
  );
  if (slots.length > 0 && !slotOk) {
    throw ApiError.badRequest('Créneau non disponible pour ce site');
  }

  if (org.max_visitors) {
    const used = await VisitBooking.sum('headcount', {
      where: {
        organization_id: org.id,
        visit_day: payload.visit_day,
        visit_start: payload.visit_start,
        visit_end: payload.visit_end,
        status: { [Op.in]: ['pending', 'confirmed'] },
      },
    });
    const already = Number(used || 0);
    if (already + payload.headcount > org.max_visitors) {
      throw ApiError.conflict(
        `Capacité dépassée (${already}/${org.max_visitors} déjà réservés pour ce créneau)`,
      );
    }
  }

  const booking = await VisitBooking.create({
    ...payload,
    teacher_user_id: teacherUserId,
    status: 'confirmed',
  });

  await notifyN8n('booking.confirmed', {
    id: booking.id,
    school_name: booking.school_name,
    teacher_email: booking.teacher_email,
    teacher_name: booking.teacher_name,
    headcount: booking.headcount,
    visit_day: booking.visit_day,
    visit_start: booking.visit_start,
    visit_end: booking.visit_end,
    site: org.name,
  });

  return booking;
}

/* Liste les réservations (orga). */
async function listBookings({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  return VisitBooking.findAll({
    where,
    include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'slug', 'city'] }],
    order: [['created_at', 'DESC']],
  });
}

/* Sites réservables avec créneaux. */
async function listBookableSites() {
  return Organization.findAll({
    where: { label_status: 'approved', is_active: true },
    attributes: [
      'id', 'name', 'slug', 'city', 'region', 'sector',
      'max_visitors', 'visit_slots', 'type',
    ],
    order: [['name', 'ASC']],
  });
}

module.exports = { createBooking, listBookings, listBookableSites };
