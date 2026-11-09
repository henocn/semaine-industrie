'use strict';

const { Op, fn, col, where: whereFn } = require('sequelize');
const {
  Organization,
  Participation,
  Passport,
  PassportVisit,
  VisitBooking,
  BusinessParticipant,
  BusinessMeeting,
} = require('../../models');
const trackingService = require('../tracking/tracking.service');
const passportService = require('../passports/passport.service');
const labelService = require('../labels/label.service');
const ApiError = require('../../utils/ApiError');
const palais = require('../participations/palais');
const media = require('../participations/media');

const TIME_ZONE = 'Africa/Lome';

/* Masque un e-mail : le code de suivi seul ne doit pas révéler le contact complet. */
function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!local || !domain) return null;
  return `${local[0]}•••@${domain}`;
}

/* Masque un téléphone : garde l'indicatif et les deux derniers chiffres. */
function maskPhone(phone) {
  const text = String(phone || '').replace(/\s+/g, '');
  if (text.length < 6) return null;
  return `${text.slice(0, 4)} •• •• •• ${text.slice(-2)}`;
}

/* Date lisible à l'heure de Lomé. */
function formatDay(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/* Heure lisible à l'heure de Lomé. */
function formatTime(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/* Date et heure d'un passage. */
function formatMoment(value) {
  return `${formatDay(value)}, ${formatTime(value)}`;
}

/* Créneau d'une visite (date du planning, sinon texte tel quel). */
function formatSlot(booking) {
  const date = new Date(`${booking.visit_day}T12:00:00Z`);
  const day = Number.isNaN(date.getTime()) ? booking.visit_day : formatDay(date);
  return `${day}, ${booking.visit_start} – ${booking.visit_end}`;
}

/* Retire les lignes sans valeur. */
function facts(rows) {
  return rows
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => ({ label, value: String(value) }));
}

/* Lieu court d'un site. */
function place(org) {
  return [org?.city, org?.region].filter(Boolean).join(', ') || null;
}

/* Vrai passage : les tampons posés à l'arrangement d'une visite ne comptent pas. */
const REAL_PASSAGE = {
  [Op.or]: [{ scanned_by: null }, { scanned_by: { [Op.ne]: passportService.ARRANGEMENT_STAMP } }],
};

/* Bilan d'un visiteur : sites visités et visites à venir. */
async function visitorSummary({ passports, bookingsWhere, headcount }) {
  const visits = passports.length
    ? await PassportVisit.findAll({
      where: { passport_id: passports.map((p) => p.id), ...REAL_PASSAGE },
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'city', 'region', 'sector'] }],
      order: [['scanned_at', 'DESC']],
    })
    : [];

  const seen = new Set(visits.map((v) => v.organization_id));
  const bookings = bookingsWhere
    ? await VisitBooking.findAll({
      where: { ...bookingsWhere, status: { [Op.in]: ['pending', 'confirmed'] } },
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'city', 'region'] }],
      order: [['visit_day', 'ASC'], ['visit_start', 'ASC']],
    })
    : [];
  const upcoming = bookings.filter((b) => !seen.has(b.organization_id));
  const regions = new Set(visits.map((v) => v.organization?.region).filter(Boolean));

  return {
    stats: [
      { label: 'Sites visités', value: seen.size },
      { label: 'Régions parcourues', value: regions.size },
      { label: 'Visites à venir', value: upcoming.length },
      ...(headcount ? [{ label: 'Personnes du groupe', value: headcount }] : []),
    ],
    passages: visits.map((v) => ({
      id: v.id,
      title: v.organization?.name || 'Site',
      detail: [v.organization?.sector, place(v.organization)].filter(Boolean).join(' · ') || null,
      when: formatMoment(v.scanned_at),
    })),
    planned: upcoming.map((b) => ({
      id: b.id,
      title: b.organization?.name || 'Site',
      detail: place(b.organization),
      when: formatSlot(b),
    })),
  };
}

/* Fichiers remis à la structure lors du label. */
function kitDocuments(org) {
  return labelService.normalizeKitFiles(org).map((file) => ({
    id: file.id,
    title: file.name,
    url: file.url,
  }));
}

/* Espace d'une inscription aux journées du Palais (code JP-) : journées choisies et entrées scannées. */
async function palaisSpace(passport, participation) {
  const days = palais.normalizeDays(participation.palais_days);
  const checkins = participation.palais_checkins || {};
  const qr = await passportService.withQr(passport);
  const row = (n, when) => {
    const day = palais.dayInfo(n);
    return { id: `palais-${n}`, title: `${day.label} : ${day.title}`, detail: `Palais des Congrès de Lomé, ${day.place.toLowerCase()}`, when };
  };
  const attended = days.filter((n) => checkins[n]);
  return {
    code: passport.code,
    type: 'palais',
    name: participation.name,
    status: participation.status,
    qr_data_url: qr.qr_data_url,
    page_url: null,
    facts: facts([
      ['Journées choisies', palais.daysShort(days)],
      ['E-mail', maskEmail(participation.email)],
      ['Téléphone', maskPhone(participation.phone)],
      ['Inscription', formatDay(participation.createdAt)],
    ]),
    documents: [],
    stats: [
      { label: 'Journées choisies', value: days.length },
      { label: 'Entrées enregistrées', value: attended.length },
    ],
    passages: attended.map((n) => row(n, `Entrée ${formatDay(checkins[n])} à ${formatTime(checkins[n])}`)),
    planned: days.filter((n) => !checkins[n]).map((n) => row(n, palais.dayInfo(n).hours)),
  };
}

/* Espace d'une accréditation média (code MD-) : média, profil, validité et QR. */
async function mediaSpace(passport, participation) {
  const qr = await passportService.withQr(passport);
  const details = participation.media_details || {};
  return {
    code: passport.code,
    type: 'media',
    name: participation.name,
    status: participation.status,
    qr_data_url: qr.qr_data_url,
    page_url: null,
    facts: facts([
      ['Média', details.outlet],
      ['Profil', media.profileLabel(details.profile)],
      ['Validité', media.MEDIA_VALIDITY],
      ['E-mail', maskEmail(participation.email)],
      ['Téléphone', maskPhone(participation.phone)],
      ['Demande', formatDay(participation.createdAt)],
    ]),
    documents: [],
    stats: [],
    passages: [],
    planned: [],
  };
}

/* Espace d'une inscription école ou particulier (code EC- ou PA-). */
async function passportSpace(passport) {
  const participation = await Participation.findOne({ where: { passport_id: passport.id } });
  if (participation?.kind === 'palais') return palaisSpace(passport, participation);
  if (participation?.kind === 'media') return mediaSpace(passport, participation);
  const isGroup = passport.kind === 'group';
  const headcount = isGroup ? (participation?.headcount || passport.headcount) : null;
  const name = participation?.name || passport.holder_name || passport.school_name || 'Participant';

  let bookingsWhere = null;
  if (isGroup) {
    bookingsWhere = passport.school_organization_id
      ? { school_organization_id: passport.school_organization_id }
      : { [Op.and]: [whereFn(fn('lower', fn('trim', col('school_name'))), name.trim().toLowerCase())] };
  }
  const qr = await passportService.withQr(passport);

  return {
    code: passport.code,
    type: isGroup ? 'ecole' : 'particulier',
    name,
    status: participation?.status || 'approved',
    qr_data_url: qr.qr_data_url,
    page_url: null,
    facts: facts([
      ['Ville', participation?.city],
      ['E-mail', maskEmail(participation?.email)],
      ['Téléphone', maskPhone(participation?.phone)],
      ['Inscription', participation ? formatDay(participation.createdAt) : null],
    ]),
    documents: [],
    ...(await visitorSummary({ passports: [passport], bookingsWhere, headcount })),
  };
}

/* Espace d'une école labellisée (ses passeports de groupe et ses visites). */
async function schoolSpace(org) {
  const passports = await Passport.findAll({
    where: { kind: 'group', school_organization_id: org.id, is_active: true },
    order: [['created_at', 'ASC']],
  });
  const qr = passports[0] ? await passportService.withQr(passports[0]) : null;
  return {
    code: org.label_code,
    type: 'ecole',
    name: org.name,
    status: 'approved',
    qr_data_url: qr?.qr_data_url || null,
    page_url: null,
    facts: facts([
      ['Lieu', place(org)],
      ['E-mail', maskEmail(org.contact_email)],
      ['Téléphone', maskPhone(org.contact_phone)],
      ['Label obtenu', org.labeled_at ? formatDay(org.labeled_at) : null],
    ]),
    documents: kitDocuments(org),
    ...(await visitorSummary({
      passports,
      bookingsWhere: { school_organization_id: org.id },
      headcount: passports[0]?.headcount || org.max_visitors,
    })),
  };
}

/* Espace d'une industrie : visiteurs reçus et visites prévues. */
async function industrySpace(org) {
  const visits = await PassportVisit.findAll({
    where: { organization_id: org.id, ...REAL_PASSAGE },
    include: [{
      model: Passport,
      as: 'passport',
      attributes: ['id', 'kind', 'holder_name', 'school_name', 'headcount'],
    }],
    order: [['scanned_at', 'DESC']],
  });
  const bookings = await VisitBooking.findAll({
    where: { organization_id: org.id, status: { [Op.in]: ['pending', 'confirmed'] } },
    order: [['visit_day', 'ASC'], ['visit_start', 'ASC']],
  });

  const groups = visits.filter((v) => v.passport?.kind === 'group');
  const people = visits.reduce(
    (sum, v) => sum + (v.passport?.kind === 'group' ? Number(v.passport.headcount) || 0 : 1),
    0,
  );
  const received = new Set(groups.map((v) => (v.passport.school_name || '').trim().toLowerCase()));
  const upcoming = bookings.filter((b) => !received.has(b.school_name.trim().toLowerCase()));

  return {
    code: org.label_code,
    type: 'industrie',
    name: org.name,
    status: 'approved',
    qr_data_url: null,
    page_url: org.slug ? `/o/${org.slug}` : null,
    facts: facts([
      ['Secteur', org.sector],
      ['Lieu', place(org)],
      ['Produits', Array.isArray(org.products) && org.products.length ? org.products.join(', ') : null],
      ['Capacité d’accueil', org.max_visitors ? `${org.max_visitors} personnes par créneau` : null],
      ['E-mail', maskEmail(org.contact_email)],
      ['Téléphone', maskPhone(org.contact_phone)],
      ['Label obtenu', org.labeled_at ? formatDay(org.labeled_at) : null],
    ]),
    documents: kitDocuments(org),
    stats: [
      { label: 'Passages reçus', value: visits.length },
      { label: 'Personnes accueillies', value: people },
      { label: 'Groupes', value: groups.length },
      { label: 'Visites à venir', value: upcoming.length },
    ],
    /* Les noms des particuliers restent privés : seul le nom des groupes est affiché. */
    passages: visits.map((v) => ({
      id: v.id,
      title: v.passport?.kind === 'group'
        ? (v.passport.school_name || v.passport.holder_name || 'Groupe')
        : 'Visiteur individuel',
      detail: v.passport?.kind === 'group' && v.passport.headcount
        ? `${v.passport.headcount} personnes`
        : null,
      when: formatMoment(v.scanned_at),
    })),
    planned: upcoming.map((b) => ({
      id: b.id,
      title: b.school_name,
      detail: `${b.headcount} personnes`,
      when: formatSlot(b),
    })),
  };
}

/* Espace d'un participant aux rencontres d'affaires. */
async function businessSpace(participant) {
  const meetings = await BusinessMeeting.findAll({
    where: {
      [Op.or]: [
        { participant_a_id: participant.id },
        { participant_b_id: participant.id },
        { attendee_ids: { [Op.contains]: [participant.id] } },
      ],
    },
    order: [['slot_start', 'ASC']],
  });

  /* Identifiants des autres participants d'un rendez-vous. */
  const idsOf = (m) => [...new Set([m.participant_a_id, m.participant_b_id, ...(m.attendee_ids || [])])]
    .filter((id) => id && id !== participant.id);
  const others = await BusinessParticipant.findAll({
    where: { id: [...new Set(meetings.flatMap(idsOf))] },
    attributes: ['id', 'organization_name', 'contact_name'],
  });
  const nameOf = new Map(others.map((o) => [o.id, o.organization_name || o.contact_name || 'Participant']));

  /* Ligne d'un rendez-vous : avec qui, où, quand. */
  const row = (m) => ({
    id: m.id,
    title: idsOf(m).map((id) => nameOf.get(id)).filter(Boolean).join(', ') || 'Rendez-vous',
    detail: [m.location, m.table_label && `table ${m.table_label}`].filter(Boolean).join(' · ') || null,
    when: `${formatDay(m.slot_start)}, ${formatTime(m.slot_start)} – ${formatTime(m.slot_end)}`,
  });
  const done = meetings.filter((m) => m.status === 'done');
  const scheduled = meetings.filter((m) => m.status === 'scheduled');

  return {
    code: participant.tracking_code,
    type: 'affaires',
    name: participant.organization_name || participant.contact_name || 'Participant',
    status: participant.status,
    qr_data_url: null,
    page_url: null,
    facts: facts([
      ['Profil', participant.kind === 'particulier' ? 'Particulier' : 'Entreprise'],
      ['Contact', participant.organization_name ? participant.contact_name : null],
      ['Secteur', participant.sector],
      ['E-mail', maskEmail(participant.email)],
      ['Téléphone', maskPhone(participant.phone)],
    ]),
    documents: [],
    stats: [
      { label: 'Rendez-vous tenus', value: done.length },
      { label: 'À venir', value: scheduled.length },
      { label: 'Annulés', value: meetings.length - done.length - scheduled.length },
    ],
    passages: [...done].reverse().map(row),
    planned: scheduled.map(row),
  };
}

/* Dossier pas encore accepté ou refusé : aucune fiche définitive, donc ni QR ni bilan. */
function requestSpace({
  code, type, name, status, rows,
}) {
  return {
    code,
    type,
    name,
    status,
    qr_data_url: null,
    page_url: null,
    facts: facts(rows),
    documents: [],
    stats: [],
    passages: [],
    planned: [],
  };
}

/* Espace d'une inscription école ou particulier en attente ou refusée. */
function participationSpace(row, waitlisted = false) {
  return requestSpace({
    code: row.tracking_code,
    type: row.kind,
    name: row.name,
    status: waitlisted ? 'waitlist' : row.status,
    rows: [
      ['Palais des Congrès', row.kind === 'palais' ? palais.daysShort(row.palais_days) : null],
      ['Média', row.kind === 'media' ? row.media_details?.outlet : null],
      ['Profil', row.kind === 'media' ? media.profileLabel(row.media_details?.profile) : null],
      ['Validité', row.kind === 'media' ? media.MEDIA_VALIDITY : null],
      ['Ville', row.city],
      ['Effectif déclaré', row.headcount ? `${row.headcount} personnes` : null],
      ['E-mail', maskEmail(row.email)],
      ['Téléphone', maskPhone(row.phone)],
      ['Inscription', formatDay(row.createdAt)],
    ],
  });
}

/* Espace d'une demande de label en attente ou refusée. */
function labelRequestSpace(row) {
  return requestSpace({
    code: row.tracking_code,
    type: 'industrie',
    name: row.structure_name,
    status: row.status,
    rows: [
      ['Secteur', row.sector],
      ['Lieu', place(row)],
      ['E-mail', maskEmail(row.contact_email)],
      ['Téléphone', maskPhone(row.contact_phone)],
      ['Demande déposée', formatDay(row.createdAt)],
    ],
  });
}

/* Construit Mon espace à partir d'un code de suivi. */
async function getByCode(rawCode) {
  const code = trackingService.normalizeCode(rawCode);
  if (!trackingService.isKnownCodeShape(code)) {
    throw ApiError.badRequest('Ce code ne ressemble pas à un code de suivi. Exemple : PA-3MXR');
  }
  const found = await trackingService.findByCode(code);
  if (found?.kind === 'passport') return passportSpace(found.passport);
  if (found?.kind === 'business') return businessSpace(found.participant);
  if (found?.kind === 'organization') {
    return found.organization.type === 'ecole'
      ? schoolSpace(found.organization)
      : industrySpace(found.organization);
  }
  const request = await trackingService.findRequestByCode(code);
  if (request?.kind === 'participation') {
    const participationService = require('../participations/participation.service');
    return participationSpace(request.participation, await participationService.isWaitlisted(request.participation));
  }
  if (request?.kind === 'label') return labelRequestSpace(request.request);
  throw ApiError.notFound('Aucun dossier ne correspond à ce code');
}

module.exports = { getByCode };
