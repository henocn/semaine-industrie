'use strict';

const { Op } = require('sequelize');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { Organization, VisitBooking } = require('../../models');

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
    sessions.set(key, { mode: 'idle', labelCode: null, orgId: null, updatedAt: Date.now() });
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

/* Menu principal (liste). */
function mainMenuPayload(to) {
  return {
    to,
    body:
      "Bienvenue dans la Semaine de l'industrie 2026.\n" +
      '16-22 novembre, Togo.\n\n' +
      'Choisissez une option dans le menu.',
    buttonLabel: 'Ouvrir le menu',
    header: "L'industrie à portée de main",
    sections: [
      {
        title: 'Découvrir',
        rows: [
          { id: 'menu_programme', title: 'Programme', description: 'Jours et temps forts' },
          { id: 'menu_carte', title: 'Carte des visites', description: 'Sites qui accueillent' },
          { id: 'menu_industrie', title: 'Annuaire industrie', description: 'Fiches labellisées' },
          { id: 'menu_label', title: 'Demander le label', description: 'Entreprise ou école' },
          { id: 'menu_affaires', title: "Rencontres d'affaires", description: 'Vendredi 20 novembre' },
          { id: 'menu_vote', title: 'Vote', description: "Coup de cœur exposition" },
        ],
      },
      {
        title: 'Mon suivi',
        rows: [
          {
            id: 'menu_suivi',
            title: 'Code de suivi',
            description: 'Label, visites, documents',
          },
        ],
      },
    ],
  };
}

/* Menu une fois le code de suivi reconnu. */
function suiviMenuPayload(to, org) {
  const typeLabel = org.type === 'ecole' ? 'École' : 'Entreprise';
  return {
    to,
    body:
      `${typeLabel} : ${org.name}\n` +
      `Code : ${org.label_code}\n\n` +
      'Que souhaitez-vous consulter ?',
    buttonLabel: 'Mon espace',
    header: 'Suivi label',
    sections: [
      {
        title: 'Espace label',
        rows: [
          { id: 'suivi_recap', title: 'Récap label', description: 'Résumé et fiche' },
          { id: 'suivi_docs', title: 'Documents', description: 'Fiche et ressources' },
          { id: 'suivi_visites', title: 'Mes visites', description: 'Prochaines programmations' },
          { id: 'suivi_itineraire', title: 'Itinéraire', description: 'Adresse et carte' },
          { id: 'suivi_autre', title: 'Autre code', description: 'Saisir un autre code' },
          { id: 'menu_home', title: 'Menu principal', description: 'Retour' },
        ],
      },
    ],
  };
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
  const typeLabel = org.type === 'ecole' ? 'École' : 'Entreprise';
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

/* Formate les documents / liens utiles. */
function formatDocs(org) {
  const fiche = `${SITE()}/o/${org.slug}`;
  const lines = [
    'Documents et liens',
    '',
    `Code : ${org.label_code}`,
    `Fiche label : ${fiche}`,
    org.type === 'entreprise' ? `Annuaire : ${SITE()}/industrie` : `Carte des visites : ${SITE()}/carte`,
    `Programme : ${SITE()}/programme`,
  ];
  if (Array.isArray(org.gallery_urls) && org.gallery_urls.length) {
    lines.push('', `${org.gallery_urls.length} image(s) sur la fiche.`);
  }
  return lines.join('\n');
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

/* Traite un identifiant de bouton / liste. */
async function handleInteractive(from, id, phoneNumberId) {
  const session = getSession(from);

  switch (id) {
    case 'menu_home':
      return replyMainMenu(from, phoneNumberId);
    case 'menu_programme':
      await sendText({
        to: from,
        phoneNumberId,
        body:
          'Programme officiel\n\n' +
          'Du 16 au 22 novembre 2026.\n' +
          'Journée phare : vendredi 20 novembre.\n\n' +
          `${SITE()}/programme`,
      });
      return sendButtons({
        to: from,
        phoneNumberId,
        body: 'Autre chose ?',
        buttons: [
          { id: 'menu_home', title: 'Menu' },
          { id: 'menu_suivi', title: 'Mon suivi' },
        ],
      });
    case 'menu_label':
      await sendText({
        to: from,
        phoneNumberId,
        body: `Demander le label\n\n${SITE()}/label\n\nAprès acceptation, vous recevrez un code de suivi (ex. SI26-1234).`,
      });
      return sendButtons({
        to: from,
        phoneNumberId,
        body: 'Continuer',
        buttons: [
          { id: 'menu_home', title: 'Menu' },
          { id: 'menu_suivi', title: 'Saisir code' },
        ],
      });
    case 'menu_carte':
      await sendText({
        to: from,
        phoneNumberId,
        body: `Carte des visites\n\n${SITE()}/carte`,
      });
      return replyMainMenu(from, phoneNumberId);
    case 'menu_industrie':
      await sendText({
        to: from,
        phoneNumberId,
        body: `Annuaire industrie\n\n${SITE()}/industrie`,
      });
      return replyMainMenu(from, phoneNumberId);
    case 'menu_affaires':
      await sendText({
        to: from,
        phoneNumberId,
        body: `Rencontres d'affaires\n\n${SITE()}/affaires`,
      });
      return replyMainMenu(from, phoneNumberId);
    case 'menu_vote':
      await sendText({
        to: from,
        phoneNumberId,
        body: `Vote coup de cœur\n\n${SITE()}/vote`,
      });
      return replyMainMenu(from, phoneNumberId);
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
    case 'suivi_docs':
    case 'suivi_visites':
    case 'suivi_itineraire': {
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
      let body = '';
      if (id === 'suivi_recap') body = formatRecap(org);
      else if (id === 'suivi_docs') body = formatDocs(org);
      else if (id === 'suivi_visites') body = await formatVisites(org);
      else body = formatItineraire(org);
      await sendText({ to: from, phoneNumberId, body });
      return sendButtons({
        to: from,
        phoneNumberId,
        body: 'Suite',
        buttons: [
          { id: 'menu_suivi', title: 'Mon espace' },
          { id: 'menu_home', title: 'Menu' },
        ],
      });
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
    await sendText({
      to: from,
      phoneNumberId,
      body: `Code reconnu pour ${org.name}.`,
    });
    return replySuiviMenu(from, org, phoneNumberId);
  }

  if (t === '1' || t.includes('programme')) return handleInteractive(from, 'menu_programme', phoneNumberId);
  if (t === '2' || t.includes('label')) return handleInteractive(from, 'menu_label', phoneNumberId);
  if (t === '3' || t.includes('carte') || t.includes('visite')) {
    return handleInteractive(from, 'menu_carte', phoneNumberId);
  }
  if (t === '4' || t.includes('industrie')) return handleInteractive(from, 'menu_industrie', phoneNumberId);
  if (t === '5' || t.includes('affaire') || t.includes('b2b')) {
    return handleInteractive(from, 'menu_affaires', phoneNumberId);
  }
  if (t === '6' || t.includes('vote')) return handleInteractive(from, 'menu_vote', phoneNumberId);
  if (t.includes('suivi') || t.includes('code')) {
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
    sent = await handleInteractive(inbound.from, inbound.interactiveId, inbound.phoneNumberId);
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

/* Notifie le contact après acceptation du label. */
async function notifyLabelApproved(organization) {
  const phone = digitsOnly(organization.contact_phone);
  if (!phone || phone.length < 8) {
    logger.info('[whatsapp] pas de téléphone pour notifier le label', organization.label_code);
    return { ok: false, reason: 'no_phone' };
  }

  const to = phone.startsWith('228') ? phone : phone.length === 8 ? `228${phone}` : phone;
  const body = [
    `Félicitations${organization.contact_name ? `, ${organization.contact_name}` : ''} !`,
    '',
    `Le label Semaine de l'industrie est accepté pour ${organization.name}.`,
    '',
    `Code de suivi : ${organization.label_code}`,
    `Fiche : ${SITE()}/o/${organization.slug}`,
    '',
    'Gardez ce code. Sur WhatsApp, ouvrez le menu puis « Code de suivi »,',
    'ou envoyez directement votre code pour voir récap, documents et visites.',
  ].join('\n');

  const sent = await sendText({ to, body });
  if (sent.ok) {
    setSession(to, {
      mode: 'linked',
      labelCode: organization.label_code,
      orgId: organization.id,
    });
    await sendButtons({
      to,
      body: 'Accéder à votre espace',
      buttons: [
        { id: 'menu_suivi', title: 'Mon suivi' },
        { id: 'menu_home', title: 'Menu' },
      ],
    });
  }
  return sent;
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
  sendList,
  processInbound,
  handleWebhook,
  notifyLabelApproved,
  verifyChallenge,
  findOrgByCode,
};
