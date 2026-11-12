'use strict';

const fs = require('fs');
const path = require('path');
const { Op, fn, col, where } = require('sequelize');
const { renderQrCard } = require('../../utils/qrCard');
const { passageQrPayload } = require('../passports/passport.service');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const {
  Organization,
  VisitBooking,
  BusinessParticipant,
  BusinessMeeting,
  Participation,
  Passport,
  PassportVisit,
} = require('../../models');
const palais = require('../participations/palais');
const media = require('../participations/media');
const trackingService = require('../tracking/tracking.service');
const resourceService = require('../resources/resource.service');
const conversationService = require('./conversation.service');

const QR_DIR = path.join(__dirname, '../../../uploads/qr');
const BTN_SUIVI = 'Suivi participation';

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
      kind: null,
      code: null,
      labelCode: null,
      orgId: null,
      passportId: null,
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
  conversationService.recordOutbound(payload, data);
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
      { id: 'menu_suivi', title: BTN_SUIVI },
      { id: 'menu_home', title: 'Menu' },
    ],
  });
}

/* Fin de parcours ou invite : texte + bouton Menu. */
async function sendWithMenu({ to, phoneNumberId, body }) {
  return sendButtons({
    to,
    phoneNumberId,
    body: String(body || '').slice(0, 1024),
    buttons: [{ id: 'menu_home', title: 'Menu' }],
  });
}

/* Invite à saisir un code de suivi : texte court, sans bouton (le bouton Menu troublait les utilisateurs). */
async function replyAskCode(from, phoneNumberId, body) {
  setSession(from, {
    mode: 'await_code',
    kind: null,
    code: null,
    labelCode: null,
    orgId: null,
    passportId: null,
    b2bId: null,
  });
  return sendText({
    to: from,
    phoneNumberId,
    body: body || 'Veuillez entrer votre code de suivi reçu à l’inscription :',
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

/* Envoie une image via URL publique HTTPS. */
async function sendImage({ to, link, phoneNumberId, caption }) {
  const image = { link: String(link) };
  if (caption) image.caption = String(caption).slice(0, 1024);
  return graphSend(phoneNumberId, { to, type: 'image', image });
}

/* Choisit image ou document selon l'extension du fichier. */
async function sendResourceFile({ to, link, phoneNumberId, caption }) {
  let filename = 'ressource';
  try {
    const base = decodeURIComponent(new URL(link, 'https://semaineindustrie.tg').pathname.split('/').pop() || '');
    if (base && base !== '.' && base !== '..') filename = base.slice(0, 240);
  } catch {
    filename = 'ressource';
  }
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    return sendImage({ to, link, phoneNumberId, caption });
  }
  return sendDocument({ to, link, filename, phoneNumberId, caption });
}

/* Envoie un document via URL publique HTTPS. */
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

/* Nom de fichier WhatsApp dérivé du titre. */
function documentFilename(title, fileUrl, originalName) {
  const source = originalName || fileUrl || 'document.pdf';
  let ext = '';
  try {
    const base = path.basename(String(source));
    const idx = base.lastIndexOf('.');
    if (idx > 0) ext = base.slice(idx).toLowerCase().replace(/[^a-z0-9.]/g, '');
  } catch {
    ext = '';
  }
  const safe = String(title || 'ressource')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'ressource';
  return `${safe}${ext || ''}`.slice(0, 240);
}

/* Envoie des documents titrés ; indique les échecs. */
async function sendTitledDocuments({ to, phoneNumberId, items, emptyBody, fallbackBody, finish }) {
  const end = (body) => (finish ? finish(body) : sendWithMenu({ to, phoneNumberId, body }));
  if (!items.length) return end(emptyBody);
  let failed = 0;
  for (const item of items) {
    const link = absUrl(item.file_url);
    if (!link) {
      failed += 1;
      continue;
    }
    const sent = await sendDocument({
      to,
      phoneNumberId,
      link,
      filename: documentFilename(item.title, item.file_url, item.original_name),
      caption: item.title,
    });
    if (!sent?.ok) failed += 1;
  }
  if (failed) return end(fallbackBody);
  return end(items.length === 1 ? 'Voici votre document.' : 'Voici vos documents.');
}

/* Convertit les fichiers kit en documents WhatsApp titrés. */
function kitDocuments(org) {
  const raw = Array.isArray(org?.kit_files) ? org.kit_files : [];
  const files = raw.length
    ? raw
    : org?.label_document_url
      ? [{ name: 'kit.pdf', url: org.label_document_url }]
      : [];
  return files
    .filter((f) => f?.url)
    .map((f) => ({
      title: f.name || 'Ressource',
      file_url: f.url,
      original_name: f.name || null,
    }));
}

/* Ressources kit de la fiche ouverte. */
async function resourcesForLinked(linked) {
  if (linked?.organization) return kitDocuments(linked.organization);
  if (linked?.passport?.school_organization_id) {
    const org = await Organization.findByPk(linked.passport.school_organization_id);
    return kitDocuments(org);
  }
  return [];
}

/* Envoie les fichiers de la fiche, ou prévient s'il n'y en a pas. */
async function replyEntryResources(from, phoneNumberId, linked) {
  const items = await resourcesForLinked(linked);
  return sendTitledDocuments({
    to: from,
    phoneNumberId,
    items,
    emptyBody: 'Aucune ressource n\'est encore jointe à votre dossier.',
    fallbackBody: `Certaines ressources n'ont pas pu être envoyées.\nTéléchargez-les ici : ${SITE()}/mon-espace`,
    finish: (body) => sendSuiviButtons(from, phoneNumberId, body, linked.kind),
  });
}

/* Envoie toutes les ressources globales du back-office. */
async function replyGlobalResources(from, phoneNumberId) {
  const items = await resourceService.listResources();
  return sendTitledDocuments({
    to: from,
    phoneNumberId,
    items,
    emptyBody: `Aucune ressource pour le moment.\n\n${SITE()}/#ressources`,
    fallbackBody: `Certaines ressources n'ont pas pu être envoyées.\nTéléchargez-les ici : ${SITE()}/#ressources`,
  });
}

/* Contenu de la carte QR : ce que le QR encode et le code affiché (jamais pour une industrie). */
async function qrCardContent(linked) {
  if (linked.passport?.code) {
    return { payload: passageQrPayload(linked.passport.code), code: linked.passport.code };
  }
  if (linked.organization?.type === 'ecole' && linked.organization.id) {
    const group = await Passport.findOne({
      where: {
        school_organization_id: linked.organization.id,
        kind: 'group',
        is_active: true,
      },
      order: [['created_at', 'DESC']],
    });
    if (group?.code) return { payload: passageQrPayload(group.code), code: group.code };
  }
  if (linked.organization?.slug) {
    return {
      payload: `${SITE()}/o/${linked.organization.slug}`,
      code: linked.organization.type === 'ecole' ? linked.code : null,
    };
  }
  return { payload: String(linked.code || SITE()), code: linked.code || null };
}

/* Écrit la carte QR et renvoie son URL publique HTTPS (nom propre aux cartes : WhatsApp peut garder une image en cache). */
async function qrImageUrl(code, card) {
  const safe = String(code || 'suivi').replace(/[^A-Z0-9-]/gi, '');
  if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });
  const filename = `${safe}-carte.png`;
  fs.writeFileSync(path.join(QR_DIR, filename), await renderQrCard(card));
  return absUrl(`/uploads/qr/${filename}`);
}

/* Envoie la carte QR en image WhatsApp. */
async function sendTrackingQr(from, phoneNumberId, linked) {
  const code = linked.code;
  if (!code) return { ok: false, reason: 'no_code' };
  const link = await qrImageUrl(code, { ...(await qrCardContent(linked)), name: linked.name });
  return sendImage({
    to: from,
    phoneNumberId,
    link,
    caption: `Votre code de suivi : ${code}`,
  });
}

/* Type de suivi d'un passeport : école (ec), Palais des Congrès (jp) ou particulier aux visites (pa). */
function passportKind(passport) {
  if (passport.kind === 'group') return 'ec';
  const code = String(passport.code || '');
  if (code.startsWith('JP-')) return 'jp';
  if (code.startsWith('MD-')) return 'md';
  return 'pa';
}

/* Actions du sous-menu selon le groupe (max 20 car. en bouton). */
function suiviActions(kind, { includeRecap = true } = {}) {
  const third = kind === 'in'
    ? { id: 'suivi_programme', title: 'Programme' }
    : kind === 'af'
      ? { id: 'b2b_rdv', title: 'Mes rendez-vous' }
      : { id: 'suivi_visites', title: ({ jp: 'Mes journées', md: 'Mon accréditation' })[kind] || 'Mes visites' };
  const actions = [];
  if (includeRecap) actions.push({ id: 'suivi_recap', title: 'Récapitulatif' });
  actions.push(
    { id: 'suivi_qr', title: 'Mon QR' },
    third,
    { id: 'suivi_ressources', title: 'Mes ressources' },
  );
  return actions;
}

/* Sous-menu : boutons si 3 actions, liste sinon (limite WhatsApp). */
async function sendSuiviButtons(from, phoneNumberId, body, kind, options) {
  const actions = suiviActions(kind, options);
  const text = String(body || 'Que souhaitez-vous ?').slice(0, 1024);
  if (actions.length <= 3) {
    return sendButtons({
      to: from,
      phoneNumberId,
      body: text,
      buttons: actions,
    });
  }
  return sendList({
    to: from,
    phoneNumberId,
    body: text,
    buttonLabel: 'Options',
    header: 'Suivi de participation',
    sections: [{ title: 'Espace', rows: actions }],
  });
}

/* Récap / liste : un message avec les boutons, ou texte puis boutons si trop long. */
async function replyLinkedContent(from, phoneNumberId, kind, body, options) {
  const text = String(body || '');
  if (text.length <= 1024) {
    return sendSuiviButtons(from, phoneNumberId, text, kind, options);
  }
  await sendText({ to: from, phoneNumberId, body: text });
  return sendSuiviButtons(from, phoneNumberId, 'Que souhaitez-vous ?', kind, options);
}

/* Texte du récap selon le type de fiche liée. */
function formatLinkedRecap(linked) {
  if (linked.organization) return formatRecap(linked.organization);
  if (linked.passport) return formatPassportRecap(linked.passport);
  if (linked.participant) return formatB2bRecap(linked.participant);
  return 'Récapitulatif indisponible.';
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

/* Programme validé : trois rendez-vous au Palais des Congrès ; usines ouvertes du 16 au 20 novembre. */
const PROGRAMME_DAYS = [
  {
    n: 16, name: 'Lundi', theme: 'Ouverture',
    where: 'Palais des Congrès (grande salle) ; industries l’après-midi',
    slots: [
      ['8h30', 'Accueil des invités et des autorités'],
      ['9h00', 'Mot de bienvenue'],
      ['9h10', 'Allocutions : ONUDI, ONU, CCI-Togo'],
      ['9h45', 'Film 2020-2025 et vision 2026-2031'],
      ['9h50', 'Discours du Ministre délégué, chargé de la Promotion des investissements, de l’Industrie et de la Souveraineté économique'],
      ['10h00', 'Remise des labels ; photo de famille'],
      ['10h45', 'Keynote sur le thème'],
      ['11h00', 'Panel sur le thème'],
      ['12h00', 'Lancement de l’exposition « Fabriqué au Togo »'],
      ['15h00', 'Visite d’industries par le Ministre'],
    ],
  },
  {
    n: 17, name: 'Mardi', theme: 'Jeunes et métiers',
    where: 'Usines le matin ; Palais des Congrès (grande salle)',
    slots: [
      ['Matin', 'Usines ouvertes : premiers créneaux'],
      ['14h00', 'Forum d’orientation des métiers'],
      ['16h00', 'Ils ont commencé petit'],
    ],
  },
  {
    n: 18, name: 'Mercredi', theme: 'Femmes dans l’industrie',
    where: 'Palais des Congrès (salle polyvalente) ; usines l’après-midi',
    slots: [
      ['9h00', 'Portraits filmés de femmes de l’industrie'],
      ['9h10', 'Panel des métiers au féminin'],
      ['Après-midi', 'Visites d’usines dirigées par des femmes'],
    ],
  },
];

/* Rappel ajouté à chaque jour : ce qui dure toute la semaine. */
const PROGRAMME_ALL_WEEK = [
  'Toute la semaine :',
  '• Usines ouvertes du 16 au 20 novembre, sur inscription',
  '• Exposition « Fabriqué au Togo » et parcours des métiers, du lundi au mercredi',
  '• Concours vidéo : 200 000 FCFA pour la meilleure vidéo de visite',
];

/* Liste WhatsApp : toute la semaine, puis chaque jour. */
function programmeListPayload(to) {
  return {
    to,
    body: 'Sélectionnez une date.',
    buttonLabel: 'Choisir un jour',
    header: 'Programme',
    sections: [
      {
        title: 'Dates',
        rows: [
          { id: 'prog_all', title: 'Toute la semaine' },
          ...PROGRAMME_DAYS.map((day) => ({
            id: `prog_${day.n}`,
            title: `${day.name} ${day.n} nov.`,
          })),
        ],
      },
    ],
  };
}

/* Texte du programme d'un jour. */
function formatProgrammeDay(day) {
  const lines = [`${day.name} ${day.n} novembre`, day.theme, ''];
  if (!day.slots.length) {
    lines.push('Exposition et bilan. Le détail est sur le site.');
  } else {
    for (const [time, label] of day.slots) {
      lines.push(`${time}  ${label}`);
    }
  }
  lines.push(
    '',
    `Lieu : ${day.where}`,
    `Assister au Palais : ${SITE()}/journees-au-palais`,
    '',
    ...PROGRAMME_ALL_WEEK,
    `Concours : ${SITE()}/concours-video`,
    '',
    `${SITE()}/programme`,
  );
  return lines.join('\n').slice(0, 1000);
}

/* Envoie le fichier programme, ou prévient s'il n'est pas encore là. */
async function replyProgrammeDocument(from, phoneNumberId) {
  const missing = "Le programme n'est pas encore disponible. Revenez bientôt.";
  let row = null;
  try {
    row = await resourceService.primaryResource();
  } catch (err) {
    logger.warn('[whatsapp] programme indisponible', err.message);
  }
  if (!row?.file_url) {
    return sendWithMenu({ to: from, phoneNumberId, body: missing });
  }
  const sent = await sendDocument({
    to: from,
    phoneNumberId,
    link: absUrl(row.file_url),
    filename: documentFilename(row.title, row.file_url),
    caption: row.title,
  });
  if (!sent?.ok) {
    return sendWithMenu({ to: from, phoneNumberId, body: missing });
  }
  return sendWithMenu({
    to: from,
    phoneNumberId,
    body: 'Voici le programme.',
  });
}

/* Envoie le fichier programme, ou le texte d'un jour. */
async function replyProgramme(from, action, phoneNumberId) {
  if (action === 'menu_programme' || action === 'prog_all') {
    return replyProgrammeDocument(from, phoneNumberId);
  }

  const day = PROGRAMME_DAYS.find((d) => action === `prog_${d.n}`);
  if (!day) return sendList({ ...programmeListPayload(from), phoneNumberId });
  return sendWithNav({
    to: from,
    phoneNumberId,
    body: formatProgrammeDay(day),
  });
}

/* Sous-menu Mon espace. */
function espaceMenuPayload(to) {
  return {
    to,
    body: 'Suivi de label.',
    buttonLabel: 'Choisir',
    header: 'Suivi de participation',
    sections: [
      {
        title: 'Accès',
        rows: [
          { id: 'espace_label', title: 'Suivi de label' },
          // { id: 'espace_b2b', title: "Rencontres d'affaires" },
          { id: 'menu_home', title: 'Menu' },
        ],
      },
    ],
  };
}

/* Demande le code pour le label, l'e-mail pour les rencontres. */
function askIdent(intent) {
  if (intent === 'b2b') {
    return "Rencontres d'affaires\n\nEnvoyez l'e-mail d'inscription ou votre code (exemple : AF-9TQB).";
  }
  return 'Suivi de label\n\nEnvoyez votre code de suivi (exemple : IN-K7P4).';
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

/* Message Participer : parcours publics + code de suivi. */
function participateBody() {
  const site = SITE();
  return [
    "*Participer à la Semaine de l'industrie*",
    '',
    `1. *Palais des Congrès* (16-18 nov.) : ${site}/journees-au-palais`,
    '',
    `2. *Visites d'usines, particuliers* : ${site}/inscription-particulier`,
    '',
    `3. *Visites d'usines, écoles / universités* : ${site}/inscription-groupe`,
    '',
    `4. *Médias et créateurs de contenu* : ${site}/accreditation-medias`,
    '',
    `5. *Labels pour les industries* : ${site}/label`,
    // Rencontres d'affaires retirées du public (programme validé) ; les inscrits existants gardent leur code AF.
    // `*Rencontres d'affaires* : ${site}/affaires`,
    '',
    'Chaque formulaire donne un code, à suivre dans « Suivi de participation ».',
  ].join('\n');
}

/* Message Informations : porteur, thème, contacts. */
function infosBody() {
  return [
    '*Informations*',
    "La Semaine de l’Industrie 2026 est portée par le Ministère délégué, chargé de la Promotion des investissements, de l’Industrie et de la Souveraineté économique.",
    'Thème : « Accélérer l’industrialisation togolaise : transformation productive, innovation et compétitivité »',
    'La participation est gratuite. Les formulaires sont dans le menu « Participer à la semaine ».',
    '✉️ infos@semaineindustrie.tg',
    `🌐 ${SITE()}`,
  ].join('\n');
}

/* Menu principal (liste, sans sous-textes). */
function mainMenuPayload(to) {
  return {
    to,
    /* Dit clairement que c'est un assistant automatique : les gens croyaient écrire à une personne. */
    body:
      "Bonjour, je suis l'assistant WhatsApp de la Semaine de l'industrie 2026 (16-22 novembre, Togo).\n\n" +
      'Je fonctionne uniquement avec le menu ci-dessous. Pour une question personnalisée, ' +
      `échangez avec l'assistant du site ${SITE()} (icône 🤖 en bas à droite) ` +
      "ou écrivez à l'équipe : infos@semaineindustrie.tg\n\n" +
      'Sélectionnez une option.',
    buttonLabel: 'Ouvrir le menu',
    header: "L'industrie à portée de main",
    sections: [
      {
        title: 'Découvrir',
        rows: [
          { id: 'menu_programme', title: 'Programme' },
          { id: 'menu_label', title: 'Participer à la semaine' },
          { id: 'menu_infos', title: 'Informations' },
          { id: 'menu_ressources', title: 'Ressources' },
        ],
      },
      {
        title: 'Accès privé',
        rows: [
          { id: 'menu_suivi', title: 'Suivi de participation' },
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
    buttonLabel: BTN_SUIVI,
    header: 'Suivi de participation',
    sections: [
      {
        title: 'Espace',
        rows: [
          { id: 'suivi_recap', title: 'Récapitulatif' },
          { id: 'suivi_label_pdf', title: 'PDF du label' },
          { id: 'suivi_visites', title: 'Mes visites' },
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

/* Libellé profil B2B (les anciens profils pme / investisseur / acheteur comptent comme entreprise). */
function b2bKindLabel(kind) {
  if (kind === 'particulier') return 'Particulier';
  return 'Entreprise';
}

/* Libellé affichable d'un participant B2B. */
function b2bDisplayName(participant) {
  return participant.contact_name || participant.organization_name || participant.email || 'Participant';
}

/* Menu espace rencontres d'affaires. */
function b2bMenuPayload(to, participant) {
  return {
    to,
    body:
      `${b2bDisplayName(participant)}\n` +
      `Statut : ${b2bStatusLabel(participant.status)}\n\n` +
      'Que souhaitez-vous ?',
    buttonLabel: BTN_SUIVI,
    header: "Rencontres d'affaires",
    sections: [
      {
        title: 'Espace',
        rows: [
          { id: 'b2b_recap', title: 'Récapitulatif' },
          { id: 'b2b_rdv', title: 'Rendez-vous' },
          { id: 'b2b_autre', title: 'Autre code' },
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
    p.contact_name ? `Contact : ${p.contact_name}` : null,
    p.organization_name ? `Organisation : ${p.organization_name}` : null,
    `Profil : ${b2bKindLabel(p.kind)}`,
    `Statut : ${b2bStatusLabel(p.status)}`,
    p.tracking_code ? `Code de suivi : ${p.tracking_code}` : null,
    `E-mail : ${p.email}`,
    p.phone ? `Téléphone : ${p.phone}` : null,
    p.sector ? `Secteur : ${p.sector}` : null,
    p.notes ? `Notes : ${p.notes}` : null,
    p.tracking_code ? '' : null,
    p.tracking_code ? 'Conservez ce code de suivi.' : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/* Formate les RDV d'un participant. */
async function formatB2bMeetings(participant) {
  const rows = await BusinessMeeting.findAll({
    where: {
      status: { [Op.in]: ['scheduled', 'done'] },
      [Op.or]: [
        { participant_a_id: participant.id },
        { participant_b_id: participant.id },
        { attendee_ids: { [Op.contains]: [participant.id] } },
      ],
    },
    order: [['slot_start', 'ASC']],
  });

  if (!rows.length) {
    return 'Aucun rendez-vous pour le moment.\nL\'équipe vous préviendra dès qu\'un créneau est fixé.';
  }

  const lines = ['Mes rendez-vous', ''];
  for (const m of rows) {
    lines.push(
      `Date : ${formatDayFr(m.slot_start)}`,
      `Horaire : ${formatSlotFr(m.slot_start, m.slot_end)}`,
      `Lieu : ${m.location || 'À confirmer'}`,
      '',
    );
  }
  return lines.join('\n').trim();
}

/* Envoie le menu B2B et mémorise la session. */
async function replyB2bMenu(from, participant, phoneNumberId) {
  const waPhone = digitsOnly(from);
  if (waPhone && (!participant.phone || participant.phone.length < 8)) {
    participant.phone = waPhone.startsWith('228') ? waPhone : waPhone;
    await participant.save().catch(() => null);
  }
  const name = b2bDisplayName(participant);
  return openLinkedSuivi(
    from,
    phoneNumberId,
    {
      kind: 'af',
      code: participant.tracking_code,
      labelCode: participant.tracking_code,
      orgId: null,
      passportId: null,
      b2bId: participant.id,
    },
    { kind: 'af', code: participant.tracking_code, participant, name },
  );
}

/* Partie d'une notification qui porte les messages (Meta direct ou n8n), sinon null. */
function inboundEnvelope(raw) {
  const body = raw?.body && typeof raw.body === 'object' ? raw.body : raw;
  const value = body?.messages?.[0] ? body : body?.entry?.[0]?.changes?.[0]?.value;
  return value?.messages?.[0] ? value : null;
}

/* Extrait le message utile (texte, bouton ou liste) depuis Meta ou n8n. */
function extractInbound(raw) {
  const envelope = inboundEnvelope(raw);
  const msg = envelope?.messages[0];
  const phoneNumberId = envelope?.metadata?.phone_number_id || env.WHATSAPP_PHONE_NUMBER_ID || '';

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

/* Détecte un code de suivi actuel ou ancien. */
function extractLabelCode(text) {
  return trackingService.extractCode(text);
}

/* Répond à un code dont le dossier n'est pas encore accepté (aucun QR ni menu de suivi). */
async function replyRequestStatus(from, found, phoneNumberId) {
  const item = found.participation || found.request;
  const participationService = require('../participations/participation.service');
  const waitlisted = found.participation ? await participationService.isWaitlisted(found.participation) : false;
  let status = 'Non retenu';
  if (waitlisted) status = "En liste d'attente";
  else if (item.status === 'pending') status = 'En cours de validation';
  return sendWithNav({
    to: from,
    phoneNumberId,
    body: [
      `Dossier : ${item.name || item.structure_name}`,
      `Statut : ${status}`,
      ...palaisFallback(found.participation),
      `Code de suivi : ${item.tracking_code}`,
      `Mon espace : ${SITE()}/mon-espace?code=${item.tracking_code}`,
    ].join('\n'),
  });
}

/* Ouvre le bon espace WhatsApp selon le type de code. */
async function openByTrackingCode(from, raw, phoneNumberId) {
  const found = await trackingService.findByCode(raw);
  if (!found) {
    const pending = await trackingService.findRequestByCode(raw);
    return pending ? replyRequestStatus(from, pending, phoneNumberId) : null;
  }
  if (found.kind === 'organization') return replySuiviMenu(from, found.organization, phoneNumberId);
  if (found.kind === 'business') return replyB2bMenu(from, found.participant, phoneNumberId);
  return replyPassportRecap(from, found.passport, phoneNumberId);
}

/* Texte d'intro du sous-menu. */
function suiviIntro(kind, name) {
  const labels = { in: 'Industrie', af: 'Affaires', pa: 'Particulier', jp: 'Palais des Congrès', md: 'Accréditation médias' };
  const label = labels[kind] || 'École';
  return `${label} : ${name}\nQue souhaitez-vous ?`;
}

/* Ouvre le suivi : mémorise le code et envoie le récap + actions (sans QR auto). */
async function openLinkedSuivi(from, phoneNumberId, patch, linked) {
  setSession(from, { mode: 'linked', ...patch });
  return replyLinkedContent(
    from,
    phoneNumberId,
    patch.kind,
    formatLinkedRecap(linked),
    { includeRecap: false },
  );
}

/* Récap passeport école (groupe) ou particulier (individuel). */
async function replyPassportRecap(from, passport, phoneNumberId) {
  const kind = passportKind(passport);
  const name = passport.holder_name || passport.school_name || 'Participant';
  return openLinkedSuivi(
    from,
    phoneNumberId,
    {
      kind,
      code: passport.code,
      labelCode: passport.code,
      orgId: null,
      passportId: passport.id,
      b2bId: null,
    },
    { kind, code: passport.code, passport, name },
  );
}

/* Formate le récap passeport école ou particulier. */
function formatPassportRecap(passport) {
  let kind = passport.kind === 'group' ? 'École' : 'Particulier';
  if (String(passport.code || '').startsWith('JP-')) kind = 'Palais des Congrès';
  if (String(passport.code || '').startsWith('MD-')) kind = 'Accréditation médias';
  const url = `${SITE()}/mon-espace?code=${passport.code}`;
  return [
    'Récapitulatif',
    '',
    `${kind} : ${passport.holder_name || passport.school_name || 'Participant'}`,
    `Code de suivi : ${passport.code}`,
    `Mon espace : ${url}`,
    '',
    'Conservez ce code de suivi.',
  ].join('\n');
}

/* Recharge la fiche liée depuis la session. */
async function loadLinked(session) {
  if (session.kind === 'af' && session.b2bId) {
    const participant = await BusinessParticipant.findByPk(session.b2bId);
    if (!participant) return null;
    return {
      kind: 'af',
      code: participant.tracking_code,
      participant,
      name: b2bDisplayName(participant),
    };
  }
  if (session.passportId) {
    const passport = await Passport.findByPk(session.passportId);
    if (!passport) return null;
    return {
      kind: passportKind(passport),
      code: passport.code,
      passport,
      name: passport.holder_name || passport.school_name || 'Participant',
    };
  }
  if (session.orgId) {
    const organization = await Organization.findByPk(session.orgId);
    if (!organization) return null;
    return {
      kind: organization.type === 'ecole' ? 'ec' : 'in',
      code: organization.label_code,
      organization,
      name: organization.name,
    };
  }
  if (session.code || session.labelCode) {
    const found = await trackingService.findByCode(session.code || session.labelCode);
    if (!found) return null;
    if (found.kind === 'organization') {
      return {
        kind: found.organization.type === 'ecole' ? 'ec' : 'in',
        code: found.organization.label_code,
        organization: found.organization,
        name: found.organization.name,
      };
    }
    if (found.kind === 'business') {
      return {
        kind: 'af',
        code: found.participant.tracking_code,
        participant: found.participant,
        name: b2bDisplayName(found.participant),
      };
    }
    return {
      kind: passportKind(found.passport),
      code: found.passport.code,
      passport: found.passport,
      name: found.passport.holder_name || found.passport.school_name || 'Participant',
    };
  }
  return null;
}

/* Formate le récap label. */
function formatRecap(org) {
  const typeLabel = org.type === 'ecole' ? 'École' : 'Industrie';
  const fiche = `${SITE()}/o/${org.slug}`;
  const lines = [
    'Récapitulatif',
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
    'Conservez ce code de suivi.',
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

/* Visites reçues par une industrie (date, horaire, groupe). */
async function formatIncomingVisites(org) {
  const bookings = await VisitBooking.findAll({
    where: {
      organization_id: org.id,
      status: { [Op.in]: ['pending', 'confirmed'] },
    },
    include: [{ model: Organization, as: 'school', attributes: ['name'] }],
    order: [
      ['visit_day', 'ASC'],
      ['visit_start', 'ASC'],
    ],
    limit: 8,
  });

  if (!bookings.length) {
    return 'Aucune visite prévue sur votre site pour le moment.';
  }

  const lines = ['Programme des visites', ''];
  for (const b of bookings) {
    const group = b.school?.name || b.school_name || 'Groupe';
    lines.push(
      `Date : ${b.visit_day}`,
      `Horaire : ${b.visit_start} à ${b.visit_end}`,
      `Groupe : ${group} (${b.headcount})`,
      '',
    );
  }
  return lines.join('\n').trim();
}

/* Visites d'une école (date, horaire, lieu). */
async function formatOutgoingVisites(org) {
  const bookings = await VisitBooking.findAll({
    where: {
      school_organization_id: org.id,
      status: { [Op.in]: ['pending', 'confirmed'] },
    },
    include: [{ model: Organization, as: 'organization', attributes: ['name', 'city'] }],
    order: [
      ['visit_day', 'ASC'],
      ['visit_start', 'ASC'],
    ],
    limit: 8,
  });

  if (!bookings.length) {
    return 'Aucune visite programmée pour le moment.';
  }

  const lines = ['Mes visites', ''];
  for (const b of bookings) {
    const lieu = [b.organization?.name, b.organization?.city].filter(Boolean).join(', ') || 'Lieu à confirmer';
    lines.push(
      `Date : ${b.visit_day}`,
      `Horaire : ${b.visit_start} à ${b.visit_end}`,
      `Lieu : ${lieu}`,
      '',
    );
  }
  return lines.join('\n').trim();
}

/* Visites d'un passeport (arrangements école, sinon tampons). */
async function formatPassportVisites(passport) {
  /* Passeport d'inscription pas encore rattaché : retrouve la fiche école par son nom. */
  const schoolName = String(passport.school_name || '').trim().toLowerCase();
  const school = passport.school_organization_id
    ? await Organization.findByPk(passport.school_organization_id)
    : passport.kind === 'group' && schoolName
      ? await Organization.findOne({
        where: {
          type: 'ecole',
          [Op.and]: [where(fn('lower', fn('trim', col('name'))), schoolName)],
        },
      })
      : null;
  if (school) {
    const booked = await formatOutgoingVisites(school);
    if (!booked.startsWith('Aucune')) return booked;
  }

  const visits = await PassportVisit.findAll({
    where: { passport_id: passport.id },
    include: [{ model: Organization, as: 'organization', attributes: ['name', 'city'] }],
    order: [['scanned_at', 'ASC']],
    limit: 8,
  });
  if (!visits.length) return 'Aucune visite enregistrée pour le moment.';

  const lines = ['Mes visites', ''];
  for (const v of visits) {
    const when = v.scanned_at ? new Date(v.scanned_at).toLocaleDateString('fr-FR') : 'Date inconnue';
    const lieu = [v.organization?.name, v.organization?.city].filter(Boolean).join(', ') || 'Lieu à confirmer';
    lines.push(`Date : ${when}`, `Lieu : ${lieu}`, '');
  }
  return lines.join('\n').trim();
}

/* Journées du Palais choisies, avec l'heure d'entrée enregistrée à l'accueil. */
async function formatPalaisJournees(passport) {
  const row = await Participation.findOne({ where: { passport_id: passport.id, kind: 'palais' } });
  const days = palais.normalizeDays(row?.palais_days);
  if (!days.length) return 'Aucune journée enregistrée pour le moment.';
  const checkins = row.palais_checkins || {};
  const time = (iso) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lome' }).format(new Date(iso));
  const lines = ['Mes journées au Palais des Congrès', ''];
  for (const n of days) {
    const day = palais.dayInfo(n);
    lines.push(`${day.label} : ${day.title}`, `${day.place}, ${day.hours}`);
    lines.push(checkins[n] ? `Entrée enregistrée à ${time(checkins[n])}` : 'Présentez votre QR à l’accueil.');
    lines.push('');
  }
  return lines.join('\n').trim();
}

/* Accréditation média : média, profil et période de validité. */
async function formatMediaAccreditation(passport) {
  const row = await Participation.findOne({ where: { passport_id: passport.id, kind: 'media' } });
  const details = row?.media_details || {};
  return [
    'Mon accréditation',
    '',
    `Nom : ${row?.name || passport.holder_name || 'Participant'}`,
    ...(details.outlet ? [`Média : ${details.outlet}`] : []),
    `Profil : ${media.profileLabel(details.profile)}`,
    `Validité : ${media.MEDIA_VALIDITY}`,
    '',
    'Présentez votre QR à l’accueil du Palais des Congrès et lors des visites d’usines.',
  ].join('\n');
}

/* Liste les prochaines visites liées à l'organisation (site ou école). */
async function formatVisites(org) {
  if (org.type === 'entreprise') return formatIncomingVisites(org);
  return formatOutgoingVisites(org);
}

/* Envoie le menu principal. */
async function replyMainMenu(from, phoneNumberId) {
  setSession(from, { mode: 'idle', intent: null });
  return sendList({ ...mainMenuPayload(from), phoneNumberId });
}

/* Envoie le menu suivi pour une org déjà liée. */
async function replySuiviMenu(from, org, phoneNumberId) {
  const kind = org.type === 'ecole' ? 'ec' : 'in';
  return openLinkedSuivi(
    from,
    phoneNumberId,
    {
      kind,
      code: org.label_code,
      labelCode: org.label_code,
      orgId: org.id,
      passportId: null,
      b2bId: null,
    },
    { kind, code: org.label_code, organization: org, name: org.name },
  );
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
    'espace_label',
    'espace_b2b',
    'prog_all',
    'suivi_autre',
    'suivi_recap',
    'suivi_qr',
    'suivi_programme',
    'suivi_label_pdf',
    'suivi_visites',
    'suivi_ressources',
    'b2b_recap',
    'b2b_rdv',
    'b2b_autre',
  ]);
  if (known.has(id) || String(id).startsWith('prog_')) return id;
  const t = normalize(title || id);
  if (t.includes('mes ressources')) return 'suivi_ressources';
  if (t.includes('document') || t.includes('ressource')) return 'menu_ressources';
  if (
    t.includes('rencontre')
    || t.includes('affaire')
    || t.includes('b2b')
    || t.includes('espace')
    || t.includes('suivi')
    || t.includes('mon suivi')
  ) return 'menu_suivi';
  if (t.includes('participer') || t.includes('demander le label') || t === 'label') return 'menu_label';
  if (t.includes('information')) return 'menu_infos';
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
    case 'menu_programme':
    case 'prog_all':
      return replyProgramme(from, action, phoneNumberId);
    case 'menu_label':
      return sendButtons({
        to: from,
        phoneNumberId,
        body: participateBody(),
        buttons: [{ id: 'menu_home', title: 'Menu' }],
      });
    case 'menu_infos':
      return sendButtons({
        to: from,
        phoneNumberId,
        body: infosBody(),
        buttons: [{ id: 'menu_home', title: 'Menu' }],
      });
    case 'menu_ressources':
      return replyGlobalResources(from, phoneNumberId);
    case 'menu_suivi':
    case 'espace_label':
    case 'espace_b2b':
    case 'menu_b2b':
      return replyAskCode(from, phoneNumberId);
    case 'suivi_autre':
    case 'b2b_autre':
      return replyAskCode(from, phoneNumberId, 'Entrez le nouveau code de suivi (ex. IN-K7P4).');
    case 'suivi_recap':
    case 'suivi_qr':
    case 'suivi_programme':
    case 'suivi_label_pdf':
    case 'suivi_visites':
    case 'suivi_ressources':
    case 'b2b_recap':
    case 'b2b_rdv': {
      const linked = await loadLinked(session);
      if (!linked) {
        return replyAskCode(from, phoneNumberId, 'Session expirée. Entrez à nouveau votre code de suivi.');
      }
      if (action === 'suivi_qr') {
        try {
          await sendTrackingQr(from, phoneNumberId, linked);
        } catch (err) {
          logger.warn('[whatsapp] QR image failed', err.message);
        }
        return sendSuiviButtons(from, phoneNumberId, 'Que souhaitez-vous ?', linked.kind);
      }
      if (action === 'suivi_ressources') {
        return replyEntryResources(from, phoneNumberId, linked);
      }
      if (action === 'suivi_recap' || action === 'b2b_recap') {
        return replyLinkedContent(
          from,
          phoneNumberId,
          linked.kind,
          formatLinkedRecap(linked),
          { includeRecap: false },
        );
      }
      if (action === 'suivi_programme' || action === 'suivi_label_pdf') {
        if (!linked.organization) {
          return replyLinkedContent(from, phoneNumberId, linked.kind, 'Aucune visite prévue sur votre site pour le moment.');
        }
        return replyLinkedContent(from, phoneNumberId, linked.kind, await formatIncomingVisites(linked.organization));
      }
      if (action === 'suivi_visites' && linked.kind === 'md' && linked.passport) {
        return replyLinkedContent(from, phoneNumberId, linked.kind, await formatMediaAccreditation(linked.passport));
      }
      if (action === 'suivi_visites' && linked.kind === 'jp' && linked.passport) {
        return replyLinkedContent(from, phoneNumberId, linked.kind, await formatPalaisJournees(linked.passport));
      }
      if (action === 'suivi_visites') {
        const visits = linked.passport
          ? await formatPassportVisites(linked.passport)
          : linked.organization
            ? await formatOutgoingVisites(linked.organization)
            : 'Aucune visite enregistrée pour le moment.';
        return replyLinkedContent(from, phoneNumberId, linked.kind, visits);
      }
      if (action === 'b2b_rdv') {
        if (!linked.participant) {
          return replyAskCode(from, phoneNumberId, 'Session expirée. Entrez à nouveau votre code de suivi.');
        }
        return replyLinkedContent(from, phoneNumberId, linked.kind, await formatB2bMeetings(linked.participant));
      }
      return sendSuiviButtons(from, phoneNumberId, suiviIntro(linked.kind, linked.name), linked.kind);
    }
    default:
      if (String(action).startsWith('prog_')) {
        return replyProgramme(from, action, phoneNumberId);
      }
      return replyMainMenu(from, phoneNumberId);
  }
}

/* Ouvre le suivi label (code) ou les rencontres (e-mail ou code AF). */
async function resolveIdent(from, text, phoneNumberId, intent) {
  const email = extractEmail(text);
  const code = extractLabelCode(text)
    || (trackingService.isKnownCodeShape(text) ? trackingService.normalizeCode(text) : null);

  if (code) {
    const opened = await openByTrackingCode(from, code, phoneNumberId);
    if (opened) return opened;
  }

  if (intent === 'b2b' && email) {
    const participant = await findB2bByEmail(email);
    if (participant) return replyB2bMenu(from, participant, phoneNumberId);
  }

  return replyAskCode(
    from,
    phoneNumberId,
    'Code introuvable. Vérifiez-le et renvoyez-le (JP-4KTW, PA-3MXR, EC-G7H5, MD-7RQA ou IN-K7P4).',
  );
}

/* Traite un message texte libre. */
async function handleText(from, text, phoneNumberId) {
  const t = normalize(text);
  const session = getSession(from);

  if (!t || t === 'menu' || t === 'bonjour' || t === 'hello' || t === 'salut' || t === 'start' || t === 'aide' || t === 'help' || t === 'hi') {
    return replyMainMenu(from, phoneNumberId);
  }

  const awaitingCode = session.mode === 'await_code'
    || session.mode === 'await_ident'
    || session.mode === 'await_b2b_email';
  if (session.mode === 'await_ident' || session.mode === 'await_b2b_email') {
    setSession(from, { mode: 'await_code' });
  }

  const emailInText = extractEmail(text);
  if (emailInText && !awaitingCode) {
    const participant = await findB2bByEmail(emailInText);
    if (participant) return replyB2bMenu(from, participant, phoneNumberId);
  }
  const codeInText = extractLabelCode(text)
    || (awaitingCode && trackingService.isKnownCodeShape(text)
      ? trackingService.normalizeCode(text)
      : null);
  if (codeInText || awaitingCode) {
    const code = trackingService.normalizeCode(codeInText || text);
    const opened = await openByTrackingCode(from, code, phoneNumberId);
    if (opened) return opened;
    return replyAskCode(
      from,
      phoneNumberId,
      'Code introuvable. Vérifiez-le et renvoyez-le (JP-4KTW, PA-3MXR, EC-G7H5, MD-7RQA ou IN-K7P4).',
    );
  }

  if (t === '1' || t.includes('programme')) return handleInteractive(from, 'menu_programme', phoneNumberId);
  if (t === '2' || t.includes('label') || t.includes('participer')) return handleInteractive(from, 'menu_label', phoneNumberId);
  if (t === '3' || t.includes('info') || t.includes('contact')) {
    return handleInteractive(from, 'menu_infos', phoneNumberId);
  }
  if (t === '4' || t.includes('ressource') || t.includes('telecharg') || t.includes('document')) {
    return handleInteractive(from, 'menu_ressources', phoneNumberId);
  }
  if (
    t === '5'
    || t.includes('suivi')
    || t.includes('espace')
    || t.includes('code')
    || t.includes('rencontre')
    || t.includes('affaire')
    || t.includes('b2b')
  ) {
    return handleInteractive(from, 'menu_suivi', phoneNumberId);
  }

  return replyMainMenu(from, phoneNumberId);
}

/* Point d'entrée bot : inbound Meta/n8n → réponses interactives. */
async function processInbound(raw) {
  const envelope = inboundEnvelope(raw);
  if (envelope?.messages[0]?.from) conversationService.recordInbound(envelope);

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
    `Code de suivi : ${organization.label_code}`,
    `Fiche : ${SITE()}/o/${organization.slug}`,
    '',
    'Conservez ce code de suivi.',
    'Sur WhatsApp : Suivi de participation, ou envoyez le code.',
    `Sur le site : ${SITE()}/mon-espace?code=${organization.label_code}`,
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

  const templateName = 'si26_label_valide2';
  const bodyParams = [organization.name, organization.label_code];

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

/* Essaie les modèles dans l'ordre (un modèle pas encore approuvé passe au suivant), puis un message de session. */
async function sendTemplateOrText({ phone, templates, fallback }) {
  const to = toWaRecipient(phone);
  if (!to) return { ok: false, reason: 'no_phone' };
  for (const template of templates) {
    const sent = await sendTemplate({ to, ...template });
    if (sent.ok) return sent;
    logger.warn('[whatsapp] template indisponible', template.name);
  }
  return sendWithNav({ to, body: fallback.join('\n') });
}

/* Accusé de réception d'une demande de label. */
async function notifyLabelReceived(request) {
  return sendTemplateOrText({
    phone: request?.contact_phone,
    templates: [
      { name: 'si26_label_encours2', bodyParams: [request.structure_name, request.tracking_code] },
      { name: 'si26_label_encours', bodyParams: [request.structure_name] },
    ],
    fallback: [
      `Bonjour, votre demande de label pour ${request.structure_name} est en cours d'examen.`,
      `Code de suivi : ${request.tracking_code}.`,
      'Vous aurez bientôt une confirmation.',
    ],
  });
}

/* Refus d'une demande de label. */
async function notifyLabelRejected(request) {
  return sendTemplateOrText({
    phone: request?.contact_phone,
    templates: [{ name: 'si26_label_refuse', bodyParams: [request.structure_name] }],
    fallback: [
      `Bonjour, votre demande de label pour ${request.structure_name} n'a pas été acceptée.`,
      "Pour en savoir plus, contactez l'équipe d'organisation (menu Informations).",
    ],
  });
}

/* Journées du Palais choisies, pour les messages de secours (une inscription « palais » seulement). */
function palaisFallback(participation) {
  if (participation?.kind === 'media') {
    return [`Accréditation médias (${media.summary(participation.media_details)}), valable ${media.MEDIA_VALIDITY}.`];
  }
  if (participation?.kind !== 'palais') return [];
  const palais = require('../participations/palais');
  return [`Palais des Congrès : ${palais.daysShort(participation.palais_days)}.`];
}

/* Accusé de réception d'une inscription école / centre / université. */
async function notifyParticipationReceived(participation) {
  const { name, tracking_code: code } = participation;
  return sendTemplateOrText({
    phone: participation?.phone,
    templates: [
      {
        name: participation.kind === 'ecole' ? 'si26_inscription_encours2' : 'si26_particulier_encours',
        bodyParams: [name, code],
      },
      { name: 'si26_inscription_encours', bodyParams: [name] },
    ],
    fallback: [
      `Bonjour, la participation pour le compte de ${name} est en cours de validation.`,
      ...palaisFallback(participation),
      `Code de suivi : ${code}.`,
      'Vous recevrez bientôt une confirmation.',
    ],
  });
}

/* Particulier inscrit au-delà des places : liste d'attente (modèle si26_particulier_attente). */
async function notifyParticipationWaitlisted(participation) {
  const { name, tracking_code: code } = participation;
  return sendTemplateOrText({
    phone: participation?.phone,
    templates: [{ name: 'si26_particulier_attente', bodyParams: [name, code] }],
    fallback: [
      `Bonjour, l'inscription de ${name} à la Semaine de l'industrie 2026 est bien enregistrée.`,
      "Toutes les places prévues pour les particuliers sont déjà attribuées : elle est placée en liste d'attente.",
      `Code de suivi : ${code}.`,
      "Nous vous préviendrons dès qu'une place se libère.",
    ],
  });
}

/* Confirme l'inscription : places accordées + code de suivi. */
async function notifyParticipationApproved(participation) {
  const code = participation?.passport?.code;
  if (!code) return { ok: false, reason: 'no_code' };
  const individual = participation.kind !== 'ecole';
  const places = individual ? 1 : participation.headcount || '-';
  return sendTemplateOrText({
    phone: participation?.phone,
    templates: [
      ...(individual ? [{ name: 'si26_particulier_acceptee', bodyParams: [participation.name, code] }] : []),
      { name: 'si26_inscription_acceptee', bodyParams: [participation.name, places, code] },
    ],
    fallback: [
      `Bonjour, la participation pour le compte de ${participation.name} est acceptée.`,
      ...(individual ? [] : [`Nombre de places accordées : ${places}.`]),
      ...palaisFallback(participation),
      `Code de suivi : ${code}.`,
      ...(individual ? [] : ["Vous serez prévenu dès qu'une visite sera arrangée."]),
    ],
  });
}

/* Refus d'une inscription. */
async function notifyParticipationRejected(participation) {
  return sendTemplateOrText({
    phone: participation?.phone,
    templates: [
      ...(participation.kind !== 'ecole' ? [{ name: 'si26_particulier_refusee', bodyParams: [participation.name] }] : []),
      { name: 'si26_inscription_refusee', bodyParams: [participation.name] },
    ],
    fallback: [
      `Bonjour, la participation pour le compte de ${participation.name} n'a pas été acceptée.`,
      "Pour en savoir plus, contactez l'équipe d'organisation (menu Informations).",
    ],
  });
}

/* Rappel du code de suivi, en message de session. */
async function notifyLabelReminder(organization) {
  const to = toWaRecipient(organization.contact_phone);
  if (!to) return { ok: false, reason: 'no_phone' };

  return sendWithNav({
    to,
    body: [
      `Bonjour${organization.contact_name ? ` ${organization.contact_name}` : ''},`,
      '',
      `Rappel pour ${organization.name}.`,
      `Code de suivi : ${organization.label_code}`,
      '',
      `Mon espace : ${SITE()}/mon-espace?code=${organization.label_code}`,
    ].join('\n'),
  });
}

/* Rappel visite (template UTILITY). */
async function notifyVisitReminder({ organization, visitDay, visitSlot, place, role }) {
  const to = toWaRecipient(organization.contact_phone);
  if (!to) return { ok: false, reason: 'no_phone' };

  const bodyParams = [
    organization.contact_name || organization.name,
    'visite',
    visitDay || '-',
    visitSlot || '-',
    place || organization.name,
  ];

  let sent = await sendTemplate({
    to,
    name: 'si26_rappel_fixe',
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

/* Formate une plage horaire (hh:mm à hh:mm). */
function formatSlotFr(start, end) {
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  const opts = { hour: '2-digit', minute: '2-digit' };
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '-';
  return `${a.toLocaleTimeString('fr-FR', opts)} à ${b.toLocaleTimeString('fr-FR', opts)}`;
}

/* Formate deux heures de visite en « 09:00 à 11:00 ». */
function formatVisitHours(start, end) {
  const toHm = (value) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return raw;
    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  };
  const from = toHm(start);
  const to = toHm(end);
  if (from && to) return `${from} à ${to}`;
  return from || to || '-';
}

/* Notifie école (visite) + site (accueil) quand une visite est programmée. */
async function notifyVisitScheduled({ school, site, visitDay, visitStart, visitEnd, headcount }) {
  const day =
    typeof visitDay === 'string' && visitDay.includes('-')
      ? visitDay.split('-').reverse().join('/')
      : String(visitDay || '-');
  const slot = formatVisitHours(visitStart, visitEnd);
  const greet = (org) => org?.contact_name || org?.name || '-';
  const targets = [
    {
      org: school,
      roleName: school?.name,
      place: site?.name,
      template: 'si26_visite_fixee',
      bodyParams: [greet(school), day, slot, site?.name || '-'],
    },
    {
      org: site,
      roleName: school?.name,
      place: site?.name,
      template: 'si26_visite_accueil_',
      bodyParams: [greet(site), school?.name || '-', day, slot, headcount || '-'],
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
    let sent = await sendTemplate({
      to,
      name: t.template,
      bodyParams: t.bodyParams,
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
  const lieu = meeting.location || 'À confirmer';
  const templateName = rescheduled ? 'si26_rdv_reporte2' : 'si26_rdv_fixe';

  const results = [];
  for (const self of list) {
    if (self.contact_opt_in === false) {
      results.push({ ok: false, reason: 'no_opt_in', email: self.email });
      continue;
    }
    const others = list
      .filter((p) => p.id !== self.id)
      .map((p) => b2bDisplayName(p))
      .join(', ') || 'partenaire';
    const to = toWaRecipient(self.phone);
    if (!to) {
      results.push({ ok: false, reason: 'no_phone', email: self.email });
      continue;
    }
    const bodyParams = [b2bDisplayName(self), day, slot, lieu.slice(0, 60)];
    let sent = await sendTemplate({ to, name: templateName, bodyParams });
    if (!sent.ok) {
      const fallback = rescheduled
        ? [
          `Bonjour ${b2bDisplayName(self)},`,
          '',
          'Rendez-vous reporté',
          `Date : ${day}`,
          `Horaire : ${slot}`,
          `Lieu : ${lieu}`,
        ]
        : [
          `Bonjour ${b2bDisplayName(self)},`,
          '',
          'Rendez-vous confirmé',
          `Date : ${day}`,
          `Horaire : ${slot}`,
          `Lieu : ${lieu}`,
          `Avec : ${others}`,
        ];
      sent = await sendText({
        to,
        body: fallback.join('\n'),
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
  notifyLabelReceived,
  notifyLabelRejected,
  notifyParticipationReceived,
  notifyParticipationWaitlisted,
  notifyParticipationApproved,
  notifyParticipationRejected,
  notifyLabelReminder,
  notifyVisitReminder,
  notifyVisitScheduled,
  notifyBusinessMeeting,
  verifyChallenge,
};
