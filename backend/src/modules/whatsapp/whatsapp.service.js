'use strict';

const { Op } = require('sequelize');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const {
  Organization,
  VisitBooking,
  BusinessParticipant,
  BusinessMeeting,
} = require('../../models');

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const SITE = () => String(env.PUBLIC_APP_URL || 'https://semaineindustrie.tg').replace(/\/$/, '');

/* Sessions légères par numéro (process PM2 unique). */
const sessions = new Map();

/* Normalise un numéro (chiffres seulement). */
function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/* Lit ou crée la session WhatsApp d'un correspondant. */
function getSession(from) {
  const key = digitsOnly(from);
  if (!sessions.has(key)) {
    sessions.set(key, {
      mode: 'idle',
      labelCode: null,
      orgId: null,
      b2bId: null,
      updatedAt: Date.now(),
    });
  }
  return sessions.get(key);
}

/* Met à jour la session. */
function setSession(from, patch) {
  const current = getSession(from);
  sessions.set(digitsOnly(from), { ...current, ...patch, updatedAt: Date.now() });
}

/* Appel Graph WhatsApp générique. */
async function graphSend(phoneNumberId, payload) {
  const token = env.WHATSAPP_TOKEN;
  const id = phoneNumberId || env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !id) {
    logger.warn('[whatsapp] token ou phone number id manquant');
    return { ok: false, reason: 'missing_config' };
  }

  const res = await fetch(`${GRAPH_BASE}/${id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.warn('[whatsapp] send failed', res.status, data);
    return { ok: false, status: res.status, data };
  }
  return { ok: true, data };
}

/* Envoie un message texte. */
async function sendText({ to, body, phoneNumberId }) {
  return graphSend(phoneNumberId, {
    to,
    type: 'text',
    text: { body: String(body || '').slice(0, 4096), preview_url: true },
  });
}

/* Envoie un message à boutons de réponse (max 3). */
async function sendButtons({ to, body, buttons, phoneNumberId, header }) {
  const interactive = {
    type: 'button',
    body: { text: String(body || '').slice(0, 1024) },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: 'reply',
        reply: {
          id: String(b.id).slice(0, 256),
          title: String(b.title).slice(0, 20),
        },
      })),
    },
  };
  if (header) {
    interactive.header = { type: 'text', text: String(header).slice(0, 60) };
  }
  return graphSend(phoneNumberId, { to, type: 'interactive', interactive });
}

/* Contenu + navigation en un seul message (évite le texte « Suite »). */
async function sendWithNav({ to, body, phoneNumberId, header }) {
  return sendButtons({
    to,
    phoneNumberId,
    header,
    body: String(body || '').slice(0, 1024),
    buttons: [
      { id: 'menu_suivi', title: 'Mon espace' },
      { id: 'menu_home', title: 'Menu' },
    ],
  });
}

/* Envoie un template WhatsApp approuvé (hors fenêtre 24h). */
async function sendTemplate({
  to,
  name,
  languageCode,
  bodyParams,
  buttonParams,
  phoneNumberId,
}) {
  const components = [];
  if (bodyParams && bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((p) => ({
        type: 'text',
        text: String(p ?? '').slice(0, 1024) || '-',
      })),
    });
  }
  if (buttonParams && buttonParams.length) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: buttonParams.map((p) => ({
        type: 'text',
        text: String(p ?? '').slice(0, 200) || '-',
      })),
    });
  }
  return graphSend(phoneNumberId, {
    to,
    type: 'template',
    template: {
      name: String(name),
      language: { code: languageCode || env.WHATSAPP_TEMPLATE_LANG || 'fr' },
      ...(components.length ? { components } : {}),
    },
  });
}

/* Envoie un document PDF via URL publique HTTPS. */
async function sendDocument({ to, link, filename, phoneNumberId, caption }) {
  const doc = {
    link: String(link),
    filename: String(filename || 'document.pdf').slice(0, 240),
  };
  if (caption) doc.caption = String(caption).slice(0, 1024);
  return graphSend(phoneNumberId, { to, type: 'document', document: doc });
}

/* URL absolue pour un chemin local. */
function absUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/* Chemin PDF programme (pointeur ou défaut env). */
function programmePdfPath() {
  const fs = require('fs');
  const pathMod = require('path');
  const pointer = pathMod.join(__dirname, '../../../uploads/docs/programme-current.txt');
  if (fs.existsSync(pointer)) {
    const stored = fs.readFileSync(pointer, 'utf8').trim();
    if (stored.startsWith('/uploads/docs/')) return stored;
  }
  return env.PROGRAMME_PDF_URL || '/uploads/docs/programme-si2026.pdf';
}

/* Envoie un menu liste WhatsApp. */
async function sendList({ to, body, buttonLabel, sections, phoneNumberId, header }) {
  const interactive = {
    type: 'list',
    body: { text: String(body || '').slice(0, 1024) },
    action: {
      button: String(buttonLabel || 'Menu').slice(0, 20),
      sections: sections.map((section) => ({
        title: String(section.title || 'Options').slice(0, 24),
        rows: (section.rows || []).slice(0, 10).map((row) => ({
          id: String(row.id).slice(0, 200),
          title: String(row.title).slice(0, 24),
          description: row.description ? String(row.description).slice(0, 72) : undefined,
        })),
      })),
    },
  };
  if (header) {
    interactive.header = { type: 'text', text: String(header).slice(0, 60) };
  }
  return graphSend(phoneNumberId, { to, type: 'interactive', interactive });
}

/* Menu principal (liste, sans sous-textes). */
function mainMenuPayload(to) {
  return {
    to,
    body:
      "Bienvenue dans la Semaine de l'industrie 2026.\n" +
      '16-22 novembre, Togo.\n\n' +
      'Choisissez une option.',
    buttonLabel: 'Ouvrir le menu',
    header: "L'industrie à portée de main",
    sections: [
      {
        title: 'Découvrir',
        rows: [
          { id: 'menu_programme', title: 'Programme' },
          { id: 'menu_label', title: 'Demander le label' },
          { id: 'menu_infos', title: 'Informations' },
        ],
      },
      {
        title: 'Accès privé',
        rows: [
          { id: 'menu_suivi', title: 'Mon espace' },
          { id: 'menu_b2b', title: "Rencontres d'affaires" },
        ],
      },
    ],
  };
}

/* Menu une fois le code de suivi reconnu. */
function suiviMenuPayload(to, org) {
  const typeLabel = org.type === 'ecole' ? 'École' : 'Industrie';
  return {
    to,
    body: `${typeLabel} : ${org.name}\nQue souhaitez-vous ?`,
    buttonLabel: 'Mon espace',
    header: 'Suivi label',
    sections: [
      {
        title: 'Espace',
        rows: [
          { id: 'suivi_recap', title: 'Récap label' },
          { id: 'suivi_label_pdf', title: 'PDF du label' },
          { id: 'suivi_visites', title: 'Mes visites' },
        ],
      },
      {
        title: '────────',
        rows: [
          { id: 'suivi_autre', title: 'Autre code' },
          { id: 'menu_home', title: 'Menu' },
        ],
      },
    ],
  };
}

/* Libellé statut participant B2B. */
function b2bStatusLabel(status) {
  if (status === 'approved') return 'Approuvé';
  if (status === 'rejected') return 'Refusé';
  return 'En attente';
}

/* Libellé profil B2B. */
function b2bKindLabel(kind) {
  if (kind === 'investisseur') return 'Investisseur';
  if (kind === 'acheteur') return 'Acheteur';
  return 'PME';
}

/* Menu espace rencontres d'affaires. */
function b2bMenuPayload(to, participant) {
  return {
    to,
    body:
      `${participant.contact_name}\n` +
      `Statut : ${b2bStatusLabel(participant.status)}\n\n` +
      'Que souhaitez-vous ?',
    buttonLabel: 'Mon espace',
    header: "Rencontres d'affaires",
    sections: [
      {
        title: 'Espace',
        rows: [
          { id: 'b2b_recap', title: 'Récapitulatif' },
          { id: 'b2b_rdv', title: 'Rendez-vous' },
        ],
      },
      {
        title: '────────',
        rows: [
          { id: 'b2b_autre', title: 'Autre e-mail' },
          { id: 'menu_home', title: 'Menu' },
        ],
      },
    ],
  };
}

/* Extrait un e-mail d'un texte libre. */
function extractEmail(text) {
  const m = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0].toLowerCase() : null;
}

/* Charge un participant B2B par e-mail. */
async function findB2bByEmail(email) {
  if (!email) return null;
  return BusinessParticipant.findOne({
    where: { email: String(email).toLowerCase().trim() },
  });
}

/* Formate le récap d'inscription B2B. */
function formatB2bRecap(p) {
  return [
    'Récapitulatif inscription',
    '',
    `Contact : ${p.contact_name}`,
    `Organisation : ${p.organization_name}`,
    `Profil : ${b2bKindLabel(p.kind)}`,
    `Statut : ${b2bStatusLabel(p.status)}`,
    `E-mail : ${p.email}`,
    p.phone ? `Téléphone : ${p.phone}` : null,
    p.sector ? `Secteur : ${p.sector}` : null,
    p.country ? `Pays : ${p.country}` : null,
    p.offers ? `Offre : ${p.offers}` : null,
    p.seeks ? `Recherche : ${p.seeks}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/* Formate les RDV d'un participant. */
async function formatB2bMeetings(participant) {
  const rows = await BusinessMeeting.findAll({
    where: {
      [Op.or]: [
        { participant_a_id: participant.id },
        { participant_b_id: participant.id },
      ],
      status: { [Op.in]: ['scheduled', 'done'] },
    },
    include: [
      { model: BusinessParticipant, as: 'participantA' },
      { model: BusinessParticipant, as: 'participantB' },
    ],
    order: [['slot_start', 'ASC']],
  });

  if (!rows.length) {
    return 'Aucun rendez-vous pour le moment.\nL\'équipe vous préviendra dès qu\'un créneau est fixé.';
  }

  const lines = ['Vos rendez-vous', ''];
  for (const m of rows) {
    const other =
      m.participant_a_id === participant.id ? m.participantB : m.participantA;
    const start = new Date(m.slot_start);
    const end = new Date(m.slot_end);
    const day = start.toLocaleDateString('fr-FR');
    const slot = `${start.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}-${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    lines.push(
      `• ${day} ${slot}`,
      `  Avec : ${other?.organization_name || 'partenaire'}`,
      m.table_label ? `  Table : ${m.table_label}` : null,
      `  Statut : ${m.status === 'done' ? 'Terminé' : 'Confirmé'}`,
      '',
    );
  }
  return lines.filter((l) => l !== null).join('\n').trim();
}

/* Envoie le menu B2B et mémorise la session. */
async function replyB2bMenu(from, participant, phoneNumberId) {
  const waPhone = digitsOnly(from);
  if (waPhone && (!participant.phone || participant.phone.length < 8)) {
    participant.phone = waPhone.startsWith('228') ? waPhone : waPhone;
    await participant.save().catch(() => null);
  }
  setSession(from, { mode: 'b2b_linked', b2bId: participant.id, labelCode: null, orgId: null });
  return sendList({ ...b2bMenuPayload(from, participant), phoneNumberId });
}

/* Extrait le message utile (texte, bouton ou liste) depuis Meta ou n8n. */
function extractInbound(raw) {
  const body = raw?.body && typeof raw.body === 'object' ? raw.body : raw;
  let msg = null;
  let phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';

  if (body?.messages?.[0]) {
    msg = body.messages[0];
    phoneNumberId = body.metadata?.phone_number_id || phoneNumberId;
  } else {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (value?.messages?.[0]) {
      msg = value.messages[0];
      phoneNumberId = value.metadata?.phone_number_id || phoneNumberId;
    }
  }

  if (!msg || !msg.from) return null;

  let text = '';
  let interactiveId = '';

  if (msg.type === 'text' && msg.text?.body) {
    text = String(msg.text.body);
  } else if (msg.type === 'interactive') {
    const reply = msg.interactive?.button_reply || msg.interactive?.list_reply;
    interactiveId = String(reply?.id || '');
    text = String(reply?.title || '');
  } else if (msg.type === 'button' && msg.button?.text) {
    text = String(msg.button.text);
  } else {
    return null;
  }

  return {
    from: String(msg.from),
    text,
    interactiveId,
    phoneNumberId,
  };
}

/* Normalise une saisie pour détection de mots-clés. */
function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/* Détecte un code de suivi du type SI26-1234. */
function extractLabelCode(text) {
  const m = String(text || '')
    .toUpperCase()
    .match(/\bSI\d{2}-\d{4}\b/);
  return m ? m[0] : null;
}

/* Charge une organisation labellisée par code. */
async function findOrgByCode(code) {
  if (!code) return null;
  return Organization.findOne({
    where: {
      label_code: String(code).toUpperCase(),
      label_status: 'approved',
      is_active: true,
    },
  });
}

/* Formate le récap label. */
function formatRecap(org) {
  const typeLabel = org.type === 'ecole' ? 'École' : 'Industrie';
  const fiche = `${SITE()}/o/${org.slug}`;
  const lines = [
    'Récapitulatif label',
    '',
    `${typeLabel} : ${org.name}`,
    `Code de suivi : ${org.label_code}`,
    org.city ? `Ville : ${org.city}` : null,
    org.region ? `Région : ${org.region}` : null,
    org.sector ? `Secteur : ${org.sector}` : null,
    org.contact_name ? `Contact : ${org.contact_name}` : null,
    '',
    `Fiche publique : ${fiche}`,
    '',
    'Gardez ce code pour suivre vos visites et documents.',
  ];
  return lines.filter(Boolean).join('\n');
}

/* Envoie le PDF label et/ou programme pour une org liée. */
async function sendOrgDocuments(from, org, phoneNumberId, which) {
  const wantLabel = which === 'label' || which === 'both';
  const wantProg = which === 'programme' || which === 'both';
  let last = { ok: true };

  if (wantLabel) {
    if (!org.label_document_url) {
      await sendText({
        to: from,
        phoneNumberId,
        body: 'PDF du label pas encore disponible. Contactez l\'organisation.',
      });
    } else {
      last = await sendDocument({
        to: from,
        phoneNumberId,
        link: absUrl(org.label_document_url),
        filename: `Label-${org.label_code || 'SI'}.pdf`,
        caption: `Label officiel : ${org.name}`,
      });
    }
  }

  if (wantProg) {
    last = await sendDocument({
      to: from,
      phoneNumberId,
      link: absUrl(programmePdfPath()),
      filename: 'Programme-SI2026.pdf',
      caption: "Programme officiel Semaine de l'industrie 2026",
    });
  }

  return last;
}

/* Formate l'itinéraire / adresse. */
function formatItineraire(org) {
  const lines = [
    'Itinéraire',
    '',
    org.name,
    org.address || 'Adresse à compléter',
    [org.city, org.region].filter(Boolean).join(', '),
  ];
  if (org.lat != null && org.lng != null) {
    lines.push(
      '',
      `Carte : https://www.google.com/maps?q=${org.lat},${org.lng}`,
    );
  }
  lines.push('', `Aussi sur : ${SITE()}/carte`);
  return lines.filter((l) => l !== undefined).join('\n');
}

/* Liste les prochaines visites liées à l'organisation (site ou école). */
async function formatVisites(org) {
  const bookings = await VisitBooking.findAll({
    where: {
      status: { [Op.in]: ['pending', 'confirmed'] },
      [Op.or]: [{ organization_id: org.id }, { school_organization_id: org.id }],
    },
    include: [
      { model: Organization, as: 'organization', attributes: ['name', 'city'] },
      { model: Organization, as: 'school', attributes: ['name'] },
    ],
    order: [
      ['visit_day', 'ASC'],
      ['visit_start', 'ASC'],
    ],
    limit: 8,
  });

  if (!bookings.length) {
    return (
      'Aucune visite programmée pour le moment.\n\n' +
      `Carte des sites : ${SITE()}/carte\n` +
      'Revenez avec votre code dès qu\'un arrangement est confirmé.'
    );
  }

  const lines = ['Vos prochaines visites', ''];
  for (const b of bookings) {
    const siteName = b.organization?.name || 'Site';
    const schoolName = b.school?.name || b.school_name;
    const role =
      b.organization_id === org.id
        ? `Accueil de ${schoolName}`
        : `Visite chez ${siteName}`;
    lines.push(
      `• ${b.visit_day} ${b.visit_start}-${b.visit_end}`,
      `  ${role}`,
      `  ${b.headcount} participants · ${b.status}`,
      '',
    );
  }
  return lines.join('\n').trim();
}

/* Envoie le menu principal. */
async function replyMainMenu(from, phoneNumberId) {
  setSession(from, { mode: 'idle' });
  return sendList({ ...mainMenuPayload(from), phoneNumberId });
}

/* Envoie le menu suivi pour une org déjà liée. */
async function replySuiviMenu(from, org, phoneNumberId) {
  setSession(from, { mode: 'linked', labelCode: org.label_code, orgId: org.id });
  return sendList({ ...suiviMenuPayload(from, org), phoneNumberId });
}

/* Mappe un titre de bouton template vers un id interne. */
function resolveActionId(id, title) {
  const known = new Set([
    'menu_home',
    'menu_programme',
    'menu_label',
    'menu_infos',
    'menu_ressources',
    'menu_suivi',
    'menu_b2b',
    'suivi_autre',
    'suivi_recap',
    'suivi_label_pdf',
    'suivi_visites',
    'b2b_recap',
    'b2b_rdv',
    'b2b_autre',
  ]);
  if (known.has(id)) return id;
  const t = normalize(title || id);
  if (t.includes('rencontre') || t.includes('affaire') || t.includes('b2b')) return 'menu_b2b';
  if (t.includes('espace') || t.includes('suivi') || t.includes('mon suivi')) return 'menu_suivi';
  if (t === 'menu' || t.startsWith('menu')) return 'menu_home';
  return id;
}

/* Traite un identifiant de bouton / liste. */
async function handleInteractive(from, id, phoneNumberId, title = '') {
  const session = getSession(from);
  const action = resolveActionId(id, title);

  switch (action) {
    case 'menu_home':
      return replyMainMenu(from, phoneNumberId);
    case 'menu_programme': {
      const sent = await sendDocument({
        to: from,
        phoneNumberId,
        link: absUrl(programmePdfPath()),
        filename: 'Programme-SI2026.pdf',
        caption: 'Programme officiel. Aussi sur le site après code de suivi.',
      });
      if (!sent.ok) {
        return sendWithNav({
          to: from,
          phoneNumberId,
          body: `Programme web : ${SITE()}/programme\nRessources : ${SITE()}/ressources`,
        });
      }
      return sendWithNav({
        to: from,
        phoneNumberId,
        body: 'Programme envoyé. Que souhaitez-vous ensuite ?',
      });
    }
    case 'menu_label':
      return sendWithNav({
        to: from,
        phoneNumberId,
        body:
          `Demander le label\n\n${SITE()}/label\n\n` +
          'Après acceptation, vous recevez un code de suivi privé.',
      });
    case 'menu_infos':
      return sendWithNav({
        to: from,
        phoneNumberId,
        body:
          'Informations\n\n' +
          'Email : infos@semaineindustrie.tg\n' +
          `Site : ${SITE()}\n` +
          'Contact : 70 00 00 00',
      });
    case 'menu_ressources':
      if (session.orgId && session.labelCode) {
        const org = await findOrgByCode(session.labelCode);
        if (org) {
          await sendOrgDocuments(from, org, phoneNumberId, 'both');
          return replySuiviMenu(from, org, phoneNumberId);
        }
      }
      setSession(from, { mode: 'await_code' });
      return sendText({
        to: from,
        phoneNumberId,
        body:
          'Pour télécharger votre label et le programme, entrez votre code de suivi.\n' +
          `Aussi sur le site : ${SITE()}/ressources`,
      });
    case 'menu_suivi':
      if (session.orgId && session.labelCode) {
        const org = await findOrgByCode(session.labelCode);
        if (org) return replySuiviMenu(from, org, phoneNumberId);
      }
      setSession(from, { mode: 'await_code' });
      return sendText({
        to: from,
        phoneNumberId,
        body:
          'Entrez votre code de suivi (exemple : SI26-1234).\n' +
          'Il figure dans le message reçu à l\'acceptation du label.',
      });
    case 'suivi_autre':
      setSession(from, { mode: 'await_code', labelCode: null, orgId: null });
      return sendText({
        to: from,
        phoneNumberId,
        body: 'Entrez le nouveau code de suivi (ex. SI26-1234).',
      });
    case 'suivi_recap':
    case 'suivi_label_pdf':
    case 'suivi_visites': {
      const org = session.labelCode
        ? await findOrgByCode(session.labelCode)
        : null;
      if (!org) {
        setSession(from, { mode: 'await_code' });
        return sendText({
          to: from,
          phoneNumberId,
          body: 'Session expirée. Entrez à nouveau votre code de suivi.',
        });
      }
      if (action === 'suivi_label_pdf') {
        await sendOrgDocuments(from, org, phoneNumberId, 'label');
        return sendWithNav({
          to: from,
          phoneNumberId,
          body: 'Document label envoyé. Que souhaitez-vous ensuite ?',
        });
      }
      const body =
        action === 'suivi_recap' ? formatRecap(org) : await formatVisites(org);
      return sendWithNav({ to: from, phoneNumberId, body });
    }
    case 'menu_b2b':
      if (session.b2bId) {
        const p = await BusinessParticipant.findByPk(session.b2bId);
        if (p) return replyB2bMenu(from, p, phoneNumberId);
      }
      setSession(from, { mode: 'await_b2b_email', b2bId: null });
      return sendText({
        to: from,
        phoneNumberId,
        body:
          "Rencontres d'affaires\n\n" +
          'Envoyez l\'e-mail utilisé à l\'inscription.\n' +
          `Inscription : ${SITE()}/affaires`,
      });
    case 'b2b_autre':
      setSession(from, { mode: 'await_b2b_email', b2bId: null });
      return sendText({
        to: from,
        phoneNumberId,
        body: 'Envoyez le nouvel e-mail d\'inscription.',
      });
    case 'b2b_recap':
    case 'b2b_rdv': {
      const p = session.b2bId
        ? await BusinessParticipant.findByPk(session.b2bId)
        : null;
      if (!p) {
        setSession(from, { mode: 'await_b2b_email' });
        return sendText({
          to: from,
          phoneNumberId,
          body: 'Session expirée. Envoyez à nouveau votre e-mail.',
        });
      }
      const body =
        action === 'b2b_recap' ? formatB2bRecap(p) : await formatB2bMeetings(p);
      await sendText({ to: from, phoneNumberId, body });
      return replyB2bMenu(from, p, phoneNumberId);
    }
    default:
      return replyMainMenu(from, phoneNumberId);
  }
}

/* Traite un message texte libre. */
async function handleText(from, text, phoneNumberId) {
  const t = normalize(text);
  const session = getSession(from);

  if (!t || t === 'menu' || t === 'bonjour' || t === 'hello' || t === 'salut' || t === 'start' || t === 'aide' || t === 'help' || t === 'hi') {
    return replyMainMenu(from, phoneNumberId);
  }

  const emailInText = extractEmail(text);
  if (emailInText || session.mode === 'await_b2b_email') {
    const email = emailInText || String(text).trim().toLowerCase();
    if (!extractEmail(email)) {
      setSession(from, { mode: 'await_b2b_email' });
      return sendText({
        to: from,
        phoneNumberId,
        body: 'E-mail invalide. Exemple : nom@entreprise.tg',
      });
    }
    const participant = await findB2bByEmail(email);
    if (!participant) {
      setSession(from, { mode: 'await_b2b_email' });
      return sendText({
        to: from,
        phoneNumberId,
        body:
          'Aucune inscription trouvée pour cet e-mail.\n' +
          `Inscrivez-vous ici : ${SITE()}/affaires`,
      });
    }
    return replyB2bMenu(from, participant, phoneNumberId);
  }

  const codeInText = extractLabelCode(text);
  if (codeInText || session.mode === 'await_code') {
    const code = codeInText || String(text).trim().toUpperCase();
    const org = await findOrgByCode(code);
    if (!org) {
      setSession(from, { mode: 'await_code' });
      return sendText({
        to: from,
        phoneNumberId,
        body:
          'Code introuvable. Vérifiez le format SI26-1234.\n' +
          'Ou tapez MENU pour le menu principal.',
      });
    }
    return replySuiviMenu(from, org, phoneNumberId);
  }

  if (t === '1' || t.includes('programme')) return handleInteractive(from, 'menu_programme', phoneNumberId);
  if (t === '2' || t.includes('label')) return handleInteractive(from, 'menu_label', phoneNumberId);
  if (t.includes('rencontre') || t.includes('affaire') || t.includes('b2b')) {
    return handleInteractive(from, 'menu_b2b', phoneNumberId);
  }
  if (t.includes('info') || t.includes('contact')) {
    return handleInteractive(from, 'menu_infos', phoneNumberId);
  }
  if (t.includes('ressource') || t.includes('telecharg') || t.includes('document')) {
    return handleInteractive(from, 'menu_ressources', phoneNumberId);
  }
  if (t.includes('suivi') || t.includes('espace') || t.includes('code')) {
    return handleInteractive(from, 'menu_suivi', phoneNumberId);
  }

  return replyMainMenu(from, phoneNumberId);
}

/* Point d'entrée bot : inbound Meta/n8n → réponses interactives. */
async function processInbound(raw) {
  const inbound = extractInbound(raw);
  if (!inbound) {
    return { handled: false };
  }

  let sent;
  if (inbound.interactiveId) {
    sent = await handleInteractive(
      inbound.from,
      inbound.interactiveId,
      inbound.phoneNumberId,
      inbound.text,
    );
  } else {
    sent = await handleText(inbound.from, inbound.text, inbound.phoneNumberId);
  }

  return {
    handled: true,
    from: inbound.from,
    text: inbound.text,
    interactiveId: inbound.interactiveId || null,
    sent,
  };
}

/* Compatibilité ancienne API webhook directe. */
async function handleWebhook(body) {
  return processInbound(body);
}

/* Corps session de secours si le template Meta n'est pas encore approuvé. */
function buildApprovalBody(organization) {
  const typeLabel = organization.type === 'ecole' ? 'école' : 'entreprise';
  return [
    `Félicitations${organization.contact_name ? `, ${organization.contact_name}` : ''} !`,
    '',
    `Le label Semaine de l'industrie est accepté pour votre ${typeLabel} ${organization.name}.`,
    '',
    `Code de suivi privé : ${organization.label_code}`,
    `Fiche : ${SITE()}/o/${organization.slug}`,
    '',
    'Ne partagez pas ce code.',
    'Sur WhatsApp : Mon espace, ou envoyez le code.',
    `Sur le site : ${SITE()}/ressources`,
  ].join('\n');
}

/* Normalise un numéro Togo / international pour l'envoi WhatsApp. */
function toWaRecipient(phoneRaw) {
  const phone = digitsOnly(phoneRaw);
  if (!phone || phone.length < 8) return null;
  return phone.startsWith('228') ? phone : phone.length === 8 ? `228${phone}` : phone;
}

/* Notifie le contact après acceptation du label (template + secours session). */
async function notifyLabelApproved(organization) {
  const to = toWaRecipient(organization.contact_phone);
  if (!to) {
    logger.info('[whatsapp] pas de téléphone pour notifier le label', organization.label_code);
    return { ok: false, reason: 'no_phone' };
  }

  const templateName =
    organization.type === 'ecole' ? 'si26_acc_ecole_qr' : 'si26_acc_industrie_qr';
  const bodyParams = [
    organization.contact_name || 'partenaire',
    organization.name,
    organization.label_code,
  ];

  let sent = await sendTemplate({
    to,
    name: templateName,
    bodyParams,
  });

  if (!sent.ok) {
    logger.warn('[whatsapp] template acceptation indisponible, secours session', templateName);
    sent = await sendWithNav({ to, body: buildApprovalBody(organization) });
  }

  if (sent.ok) {
    setSession(to, {
      mode: 'linked',
      labelCode: organization.label_code,
      orgId: organization.id,
    });
    if (organization.label_document_url) {
      await sendOrgDocuments(to, organization, undefined, 'both');
    }
  }
  return sent;
}

/* Rappel espace / code de suivi (template UTILITY). */
async function notifyLabelReminder(organization) {
  const to = toWaRecipient(organization.contact_phone);
  if (!to) return { ok: false, reason: 'no_phone' };

  const bodyParams = [
    organization.contact_name || 'partenaire',
    organization.name,
    organization.label_code,
  ];

  let sent = await sendTemplate({
    to,
    name: 'si26_rappel_code_qr',
    bodyParams,
  });

  if (!sent.ok) {
    sent = await sendWithNav({
      to,
      body: [
        `Bonjour${organization.contact_name ? ` ${organization.contact_name}` : ''},`,
        '',
        `Rappel Semaine de l'industrie pour ${organization.name}.`,
        `Code de suivi : ${organization.label_code}`,
        '',
        `Ressources : ${SITE()}/ressources`,
      ].join('\n'),
    });
  }
  return sent;
}

/* Rappel visite (template UTILITY). */
async function notifyVisitReminder({ organization, visitDay, visitSlot, place, role }) {
  const to = toWaRecipient(organization.contact_phone);
  if (!to) return { ok: false, reason: 'no_phone' };

  const bodyParams = [
    organization.contact_name || 'partenaire',
    role || 'Visite',
    visitDay || '-',
    visitSlot || '-',
    place || organization.name,
    organization.label_code,
  ];

  let sent = await sendTemplate({
    to,
    name: 'si26_rappel_visite_v3',
    bodyParams,
  });

  if (!sent.ok) {
    sent = await sendWithNav({
      to,
      body: [
        `Bonjour${organization.contact_name ? ` ${organization.contact_name}` : ''},`,
        '',
        `Rappel visite : ${role || 'Visite'} le ${visitDay || '-'} (${visitSlot || '-'}).`,
        `Lieu : ${place || organization.name}`,
        `Code : ${organization.label_code}`,
      ].join('\n'),
    });
  }
  return sent;
}

/* Formate jour / créneau pour templates. */
function formatDayFr(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || '-');
  return d.toLocaleDateString('fr-FR');
}

/* Formate une plage horaire. */
function formatSlotFr(start, end) {
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  const opts = { hour: '2-digit', minute: '2-digit' };
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '-';
  return `${a.toLocaleTimeString('fr-FR', opts)}-${b.toLocaleTimeString('fr-FR', opts)}`;
}

/* Notifie école + site quand une visite est programmée (label accepté). */
async function notifyVisitScheduled({ school, site, visitDay, visitStart, visitEnd }) {
  const day =
    typeof visitDay === 'string' && visitDay.includes('-')
      ? visitDay.split('-').reverse().join('/')
      : String(visitDay || '-');
  const slot = `${visitStart || ''}-${visitEnd || ''}`.replace(/^-|-$/g, '') || '-';
  const targets = [
    {
      org: school,
      roleName: school?.name,
      place: site?.name,
    },
    {
      org: site,
      roleName: school?.name,
      place: site?.name,
    },
  ];

  const results = [];
  for (const t of targets) {
    if (!t.org?.contact_phone) {
      results.push({ ok: false, reason: 'no_phone' });
      continue;
    }
    const to = toWaRecipient(t.org.contact_phone);
    if (!to) {
      results.push({ ok: false, reason: 'no_phone' });
      continue;
    }
    const bodyParams = [
      t.org.contact_name || 'partenaire',
      t.roleName || 'visite',
      day,
      slot,
      t.place || '-',
      t.org.label_code || '-',
    ];
    let sent = await sendTemplate({
      to,
      name: 'si26_visite_programmee',
      bodyParams,
    });
    if (!sent.ok) {
      sent = await sendWithNav({
        to,
        body: [
          `Bonjour${t.org.contact_name ? ` ${t.org.contact_name}` : ''},`,
          '',
          `Une visite est programmée pour ${t.roleName} le ${day} (${slot}).`,
          `Lieu : ${t.place}`,
          `Code : ${t.org.label_code || '-'}`,
        ].join('\n'),
      });
    }
    results.push(sent);
  }
  return results;
}

/* Notifie les participants d'un RDV affaires (créé ou reporté). */
async function notifyBusinessMeeting({
  meeting,
  attendees,
  participantA,
  participantB,
  rescheduled = false,
}) {
  const list =
    Array.isArray(attendees) && attendees.length
      ? attendees
      : [participantA, participantB].filter(Boolean);
  if (!meeting || !list.length) return { ok: false, reason: 'missing' };

  const day = formatDayFr(meeting.slot_start);
  const slot = formatSlotFr(meeting.slot_start, meeting.slot_end);
  const lieu =
    meeting.location ||
    (meeting.table_label ? `Table ${meeting.table_label}` : 'Lieu à confirmer');
  const templateName = rescheduled ? 'si26_rdv_reporte' : 'si26_rdv_affaires';

  const results = [];
  for (const self of list) {
    if (self.contact_opt_in === false) {
      results.push({ ok: false, reason: 'no_opt_in', email: self.email });
      continue;
    }
    const others = list
      .filter((p) => p.id !== self.id)
      .map((p) => p.organization_name)
      .join(', ') || 'partenaire';
    const to = toWaRecipient(self.phone);
    if (!to) {
      results.push({ ok: false, reason: 'no_phone', email: self.email });
      continue;
    }
    const bodyParams = [
      self.contact_name || 'partenaire',
      others.slice(0, 60) || 'partenaire',
      day,
      slot,
      lieu.slice(0, 60),
    ];
    let sent = await sendTemplate({ to, name: templateName, bodyParams });
    if (!sent.ok) {
      const verb = rescheduled ? 'est reporté au' : 'confirmé le';
      sent = await sendText({
        to,
        body: [
          `Bonjour ${self.contact_name || ''},`.trim(),
          '',
          `Rendez-vous affaires ${verb} ${day} (${slot}) avec ${others}.`,
          lieu,
          '',
          "Sur WhatsApp : menu Rencontres d'affaires + votre e-mail.",
        ].join('\n'),
      });
    }
    results.push(sent);
  }
  return { ok: results.some((r) => r.ok), results };
}

/* Vérifie le challenge webhook Meta (hub.challenge). */
function verifyChallenge(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && token && token === env.WHATSAPP_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

/* Ancien buildReply conservé pour compat éventuelle. */
function buildReply(text) {
  return text;
}

module.exports = {
  buildReply,
  extractInbound,
  sendText,
  sendButtons,
  sendWithNav,
  sendList,
  sendDocument,
  sendTemplate,
  processInbound,
  handleWebhook,
  notifyLabelApproved,
  notifyLabelReminder,
  notifyVisitReminder,
  notifyVisitScheduled,
  notifyBusinessMeeting,
  verifyChallenge,
  findOrgByCode,
};
