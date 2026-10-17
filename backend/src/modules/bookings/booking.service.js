'use strict';

const { Op } = require('sequelize');
const { VisitBooking, Organization } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { notifyN8n } = require('../../utils/n8n');

/* Crée un arrangement de visite (orga) à partir du site et de l'école. */
async function createBooking(payload) {
  const site = await Organization.findOne({
    where: {
      id: payload.organization_id,
      type: 'entreprise',
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!site) throw ApiError.notFound('Site industriel introuvable ou non labellisé');

  const school = await Organization.findOne({
    where: {
      id: payload.school_organization_id,
      type: 'ecole',
      label_status: 'approved',
      is_active: true,
    },
  });
  if (!school) throw ApiError.notFound('Établissement introuvable ou non labellisé');
  if (!school.contact_email) {
    throw ApiError.badRequest('Cet établissement n’a pas d’e-mail de contact');
  }

  /* Créneau libre : l'orga arrange le rendez-vous. */
  const headcount = Number(payload.headcount || school.max_visitors || 0);
  if (!Number.isFinite(headcount) || headcount < 1) {
    throw ApiError.badRequest('Effectif invalide (renseignez l’estimation élèves de l’école)');
  }

  if (site.max_visitors) {
    const used = await VisitBooking.sum('headcount', {
      where: {
        organization_id: site.id,
        visit_day: payload.visit_day,
        visit_start: payload.visit_start,
        visit_end: payload.visit_end,
        status: { [Op.in]: ['pending', 'confirmed'] },
      },
    });
    const already = Number(used || 0);
    if (already + headcount > site.max_visitors) {
      throw ApiError.conflict(
        `Capacité dépassée (${already}/${site.max_visitors} déjà prévus pour ce créneau)`,
      );
    }
  }

  const booking = await VisitBooking.create({
    organization_id: site.id,
    school_organization_id: school.id,
    school_name: school.name,
    teacher_name: school.contact_name || school.name,
    teacher_email: school.contact_email,
    teacher_phone: school.contact_phone || null,
    visit_day: payload.visit_day,
    visit_start: payload.visit_start,
    visit_end: payload.visit_end,
    headcount,
    notes: payload.notes || null,
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
    site: site.name,
  });

  return getBookingById(booking.id);
}

/* Détail réservation avec site + école. */
async function getBookingById(id) {
  const row = await VisitBooking.findByPk(id, {
    include: [
      { model: Organization, as: 'organization', attributes: ['id', 'name', 'slug', 'city', 'max_visitors'] },
      {
        model: Organization,
        as: 'school',
        attributes: ['id', 'name', 'slug', 'city', 'contact_email', 'contact_phone', 'max_visitors'],
      },
    ],
  });
  if (!row) throw ApiError.notFound('Réservation introuvable');
  return row;
}

/* Liste les réservations (orga). */
async function listBookings({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  return VisitBooking.findAll({
    where,
    include: [
      { model: Organization, as: 'organization', attributes: ['id', 'name', 'slug', 'city'] },
      {
        model: Organization,
        as: 'school',
        attributes: ['id', 'name', 'slug', 'city', 'contact_email', 'contact_phone', 'max_visitors'],
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

/* Organisations labellisées filtrables (sites ou écoles). */
async function listBookableSites({ type } = {}) {
  const where = { label_status: 'approved', is_active: true };
  if (type === 'entreprise' || type === 'ecole') where.type = type;

  return Organization.findAll({
    where,
    attributes: [
      'id', 'name', 'slug', 'city', 'region', 'sector', 'type',
      'max_visitors', 'visit_slots', 'contact_name', 'contact_email', 'contact_phone',
    ],
    order: [['name', 'ASC']],
  });
}

module.exports = { createBooking, listBookings, listBookableSites, getBookingById };
