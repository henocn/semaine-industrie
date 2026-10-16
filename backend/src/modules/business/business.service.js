'use strict';

const { BusinessParticipant, BusinessMeeting } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { notifyN8n } = require('../../utils/n8n');

/* Inscription publique d'un participant B2B. */
async function register(payload) {
  const row = await BusinessParticipant.create({
    ...payload,
    status: 'pending',
  });
  await notifyN8n('business.participant_registered', {
    id: row.id,
    kind: row.kind,
    organization_name: row.organization_name,
    email: row.email,
  });
  return row;
}

/* Liste les participants, filtrables. */
async function listParticipants({ status, kind } = {}) {
  const where = {};
  if (status) where.status = status;
  if (kind) where.kind = kind;
  return BusinessParticipant.findAll({ where, order: [['created_at', 'DESC']] });
}

/* Approuve ou refuse un participant. */
async function reviewParticipant(id, status) {
  const row = await BusinessParticipant.findByPk(id);
  if (!row) throw ApiError.notFound('Participant introuvable');
  if (row.status !== 'pending') throw ApiError.conflict('Déjà traité');
  row.status = status;
  await row.save();
  await notifyN8n('business.participant_reviewed', {
    id: row.id,
    status,
    email: row.email,
    organization_name: row.organization_name,
  });
  return row;
}

/* Crée un rendez-vous entre deux participants approuvés. */
async function createMeeting(payload) {
  if (payload.participant_a_id === payload.participant_b_id) {
    throw ApiError.badRequest('Les deux participants doivent être distincts');
  }

  const [a, b] = await Promise.all([
    BusinessParticipant.findByPk(payload.participant_a_id),
    BusinessParticipant.findByPk(payload.participant_b_id),
  ]);
  if (!a || !b) throw ApiError.notFound('Participant introuvable');
  if (a.status !== 'approved' || b.status !== 'approved') {
    throw ApiError.badRequest('Les deux participants doivent être approuvés');
  }

  const meeting = await BusinessMeeting.create({
    ...payload,
    status: 'scheduled',
  });

  await notifyN8n('business.meeting_scheduled', {
    id: meeting.id,
    table_label: meeting.table_label,
    slot_start: meeting.slot_start,
    slot_end: meeting.slot_end,
    a: { name: a.organization_name, email: a.email },
    b: { name: b.organization_name, email: b.email },
  });

  return BusinessMeeting.findByPk(meeting.id, {
    include: [
      { model: BusinessParticipant, as: 'participantA' },
      { model: BusinessParticipant, as: 'participantB' },
    ],
  });
}

/* Liste les rendez-vous. */
async function listMeetings({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  return BusinessMeeting.findAll({
    where,
    include: [
      { model: BusinessParticipant, as: 'participantA' },
      { model: BusinessParticipant, as: 'participantB' },
    ],
    order: [['slot_start', 'ASC']],
  });
}

/* Enregistre la fiche contact post-échange + relance 3 mois. */
async function saveContactNote(id, { contact_note, status, follow_up_months }) {
  const meeting = await BusinessMeeting.findByPk(id, {
    include: [
      { model: BusinessParticipant, as: 'participantA' },
      { model: BusinessParticipant, as: 'participantB' },
    ],
  });
  if (!meeting) throw ApiError.notFound('Rendez-vous introuvable');

  meeting.contact_note = contact_note || null;
  meeting.status = status || 'done';
  if (follow_up_months > 0) {
    const d = new Date();
    d.setMonth(d.getMonth() + follow_up_months);
    meeting.follow_up_at = d;
  }
  await meeting.save();

  await notifyN8n('business.meeting_contact_note', {
    id: meeting.id,
    status: meeting.status,
    follow_up_at: meeting.follow_up_at,
    contact_note: meeting.contact_note,
    a: meeting.participantA?.email,
    b: meeting.participantB?.email,
  });

  return meeting;
}

module.exports = {
  register,
  listParticipants,
  reviewParticipant,
  createMeeting,
  listMeetings,
  saveContactNote,
};
