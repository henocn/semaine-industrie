'use strict';

const { Op } = require('sequelize');
const { BusinessParticipant, BusinessMeeting } = require('../../models');
const trackingService = require('../tracking/tracking.service');
const ApiError = require('../../utils/ApiError');
const { notifyN8n } = require('../../utils/n8n');
const { sendNotifyMail } = require('../../utils/mailer');

/* Vide une chaîne optionnelle. */
function emptyToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

/* Notes saisies (repli sur l'ancien champ « offers »). */
function notesFrom(payload) {
  return emptyToNull('notes' in payload ? payload.notes : payload.offers);
}

/* Inscription publique d'un participant B2B. */
async function register(payload) {
  if (!payload.contact_opt_in) {
    throw ApiError.badRequest('Vous devez accepter d\'être contacté par e-mail / WhatsApp');
  }
  const row = await BusinessParticipant.create({
    kind: payload.kind,
    organization_name: emptyToNull(payload.organization_name),
    contact_name: emptyToNull(payload.contact_name),
    email: payload.email,
    phone: emptyToNull(payload.phone),
    sector: emptyToNull(payload.sector),
    notes: notesFrom(payload),
    seeks: emptyToNull(payload.seeks),
    country: emptyToNull(payload.country),
    contact_opt_in: true,
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

/* Ajout manuel d'un participant (backoffice). */
async function createByOrga(payload) {
  const row = await BusinessParticipant.create({
    kind: payload.kind,
    organization_name: emptyToNull(payload.organization_name),
    contact_name: emptyToNull(payload.contact_name),
    email: payload.email,
    phone: emptyToNull(payload.phone),
    sector: emptyToNull(payload.sector),
    notes: notesFrom(payload),
    seeks: emptyToNull(payload.seeks),
    country: emptyToNull(payload.country),
    contact_opt_in: payload.contact_opt_in !== false,
    status: payload.status === 'pending' ? 'pending' : 'approved',
    tracking_code: payload.status === 'pending' ? null : await trackingService.nextCode('AF'),
  });
  await notifyN8n('business.participant_registered', {
    id: row.id,
    kind: row.kind,
    organization_name: row.organization_name,
    email: row.email,
    source: 'orga',
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

/* Modifie la fiche d'un participant (statut et code de suivi inchangés). */
async function updateParticipant(id, payload) {
  const row = await BusinessParticipant.findByPk(id);
  if (!row) throw ApiError.notFound('Participant introuvable');
  const data = {};
  if (payload.kind) data.kind = payload.kind;
  if (payload.email) data.email = payload.email;
  for (const key of ['organization_name', 'contact_name', 'phone', 'sector']) {
    if (key in payload) data[key] = emptyToNull(payload[key]);
  }
  if ('notes' in payload || 'offers' in payload) data.notes = notesFrom(payload);
  await row.update(data);
  return row;
}

/* Vrai si le participant figure dans au moins un rendez-vous. */
async function hasMeetings(id) {
  const count = await BusinessMeeting.count({
    where: {
      [Op.or]: [
        { participant_a_id: id },
        { participant_b_id: id },
        { attendee_ids: { [Op.contains]: [id] } },
      ],
    },
  });
  return count > 0;
}

/* Supprime un participant sans rendez-vous (les rendez-vous seraient supprimés avec lui). */
async function removeParticipant(id) {
  const row = await BusinessParticipant.findByPk(id);
  if (!row) throw ApiError.notFound('Participant introuvable');
  if (await hasMeetings(id)) {
    throw ApiError.conflict('Ce participant a des rendez-vous : refusez-le plutôt que de le supprimer.');
  }
  await row.destroy();
  return { id, label: row.contact_name || row.organization_name || 'Participant' };
}

/* Accepte ou refuse un participant en attente. */
async function reviewParticipant(id, status) {
  const row = await BusinessParticipant.findByPk(id);
  if (!row) throw ApiError.notFound('Participant introuvable');
  if (row.status !== 'pending') throw ApiError.conflict('Déjà traité');
  row.status = status;
  if (status === 'approved' && !row.tracking_code) {
    row.tracking_code = await trackingService.nextCode('AF');
  }
  await row.save();
  await notifyN8n('business.participant_reviewed', {
    id: row.id,
    status,
    email: row.email,
    organization_name: row.organization_name,
  });
  return row;
}

/* Charge des participants approuvés par ids. */
async function loadApprovedAttendees(ids) {
  const unique = [...new Set((ids || []).map(String))];
  if (!unique.length) throw ApiError.badRequest('Sélectionnez au moins une personne');
  const rows = await BusinessParticipant.findAll({
    where: { id: { [Op.in]: unique }, status: 'approved' },
  });
  if (rows.length !== unique.length) {
    throw ApiError.badRequest('Tous les participants doivent être approuvés');
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  return unique.map((id) => byId.get(id)).filter(Boolean);
}

/* Formate une heure hh:mm. */
function formatTimeFr(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/* Notifie e-mail + WhatsApp pour un RDV. */
async function notifyAttendees(meeting, attendees, { rescheduled = false } = {}) {
  const day = new Date(meeting.slot_start).toLocaleDateString('fr-FR');
  const slot = `${formatTimeFr(meeting.slot_start)} à ${formatTimeFr(meeting.slot_end)}`;
  const lieu = meeting.location || 'À confirmer';
  const displayName = (p) => p.contact_name || p.organization_name || p.email || 'Participant';
  const others = (self) =>
    attendees
      .filter((p) => p.id !== self.id)
      .map((p) => displayName(p))
      .join(', ') || 'l\'équipe';

  for (const p of attendees) {
    if (!p.contact_opt_in) continue;
    const withLabel = others(p);
    const subject = rescheduled
      ? `RDV reporté : ${day} (${slot})`
      : `RDV confirmé : ${day} (${slot})`;
    const text = [
      `Bonjour ${displayName(p)},`,
      '',
      rescheduled ? 'Rendez-vous reporté' : 'Rendez-vous confirmé',
      `Date : ${day}`,
      `Horaire : ${slot}`,
      `Lieu : ${lieu}`,
      `Avec : ${withLabel}`,
    ].join('\n');
    await sendNotifyMail({ to: p.email, subject, text });
  }

  try {
    const wa = require('../whatsapp/whatsapp.service');
    await wa.notifyBusinessMeeting({
      meeting,
      attendees,
      rescheduled,
    });
  } catch {
    /* non bloquant */
  }
}

/* Crée un rendez-vous (1+ participants) + notifications. */
async function createMeeting(payload) {
  const ids = payload.participant_ids?.length
    ? payload.participant_ids
    : [payload.participant_a_id, payload.participant_b_id].filter(Boolean);

  const attendees = await loadApprovedAttendees(ids);
  const meeting = await BusinessMeeting.create({
    participant_a_id: attendees[0].id,
    participant_b_id: attendees[1]?.id || null,
    attendee_ids: attendees.map((a) => a.id),
    slot_start: payload.slot_start,
    slot_end: payload.slot_end,
    table_label: payload.table_label || null,
    location: payload.location || null,
    status: 'scheduled',
  });

  await notifyN8n('business.meeting_scheduled', {
    id: meeting.id,
    location: meeting.location,
    table_label: meeting.table_label,
    slot_start: meeting.slot_start,
    slot_end: meeting.slot_end,
    attendees: attendees.map((a) => ({ name: a.organization_name, email: a.email })),
  });

  const full = await BusinessMeeting.findByPk(meeting.id, {
    include: [
      { model: BusinessParticipant, as: 'participantA' },
      { model: BusinessParticipant, as: 'participantB' },
    ],
  });

  await notifyAttendees(full, attendees, { rescheduled: false });
  return full;
}

/* Reporte un rendez-vous et notifie. */
async function rescheduleMeeting(id, { slot_start, slot_end, table_label, location }) {
  const meeting = await BusinessMeeting.findByPk(id, {
    include: [
      { model: BusinessParticipant, as: 'participantA' },
      { model: BusinessParticipant, as: 'participantB' },
    ],
  });
  if (!meeting) throw ApiError.notFound('Rendez-vous introuvable');
  if (meeting.status === 'done' || meeting.status === 'cancelled') {
    throw ApiError.badRequest('Ce rendez-vous ne peut plus être reporté');
  }

  meeting.slot_start = slot_start;
  meeting.slot_end = slot_end;
  if (table_label !== undefined) meeting.table_label = table_label || null;
  if (location !== undefined) meeting.location = location || null;
  meeting.status = 'scheduled';
  await meeting.save();

  const attendeeIds =
    Array.isArray(meeting.attendee_ids) && meeting.attendee_ids.length
      ? meeting.attendee_ids
      : [meeting.participant_a_id, meeting.participant_b_id].filter(Boolean);
  const attendees = await BusinessParticipant.findAll({
    where: { id: { [Op.in]: attendeeIds } },
  });

  await notifyN8n('business.meeting_rescheduled', {
    id: meeting.id,
    location: meeting.location,
    table_label: meeting.table_label,
    slot_start: meeting.slot_start,
    slot_end: meeting.slot_end,
  });

  await notifyAttendees(meeting, attendees, { rescheduled: true });
  return meeting;
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
  createByOrga,
  listParticipants,
  updateParticipant,
  removeParticipant,
  reviewParticipant,
  createMeeting,
  rescheduleMeeting,
  listMeetings,
  saveContactNote,
};
