'use strict';

const env = require('../config/env');

const FOREST = '#024d3e';
const INK = '#0f1f1a';
const MUTED = '#5b6b66';
const LINE = '#dfe7e3';
const FONT = 'Arial, Helvetica, sans-serif';
const CONTACT = 'infos@semaineindustrie.tg';
const CARD_CID = 'carte-qr';

/* Échappe un texte pour le HTML. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

/* Passe les **segments** en gras dans le HTML. */
function richHtml(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${INK}">$1</strong>`);
}

/* Retire le marquage du gras pour la version texte. */
function plain(text) {
  return String(text).replace(/\*\*/g, '');
}

/* Paragraphe du corps. */
function paragraph(text) {
  return `<p style="margin:0 0 16px;font:16px/1.55 ${FONT};color:${INK}">${richHtml(text)}</p>`;
}

/* Bloc du code de suivi, sur fond vert comme sur la carte QR. */
function codeBlock(code) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr>
    <td style="background:${FOREST};padding:10px 20px;font:bold 20px/1.2 ${FONT};letter-spacing:1px;color:#ffffff">${esc(code)}</td>
  </tr></table>`;
}

/* Tableau des informations du dossier. */
function detailsBlock(details) {
  const rows = details.map(([label, value]) => `<tr>
    <td style="padding:9px 16px 9px 0;border-top:1px solid ${LINE};font:14px/1.4 ${FONT};color:${MUTED};vertical-align:top;white-space:nowrap">${esc(label)}</td>
    <td style="padding:9px 0;border-top:1px solid ${LINE};font:14px/1.4 ${FONT};color:${INK}">${esc(value)}</td>
  </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;border-bottom:1px solid ${LINE}">${rows}</table>`;
}

/* Bouton d'action. */
function buttonBlock({ label, url }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr>
    <td style="background:${FOREST}"><a href="${esc(url)}" style="display:inline-block;padding:12px 24px;font:bold 15px/1.2 ${FONT};color:#ffffff;text-decoration:none">${esc(label)}</a></td>
  </tr></table>`;
}

/* Carte QR affichée dans le message. */
function cardBlock(name) {
  return `<p style="margin:4px 0 20px"><img src="cid:${CARD_CID}" width="280" alt="Carte QR de ${esc(name)}" style="display:block;width:280px;max-width:100%;height:auto;border:1px solid ${LINE}"></p>`;
}

/* Assemble le message : HTML, texte et pièces jointes. */
function buildEmail({
  subject, intro, code = null, details = [], outro = [], button = null, card = null,
}) {
  const body = [
    paragraph('Bonjour,'),
    ...intro.map(paragraph),
    code ? `<p style="margin:0 0 6px;font:14px/1.4 ${FONT};color:${MUTED}">Votre code de suivi</p>${codeBlock(code)}` : '',
    details.length ? detailsBlock(details) : '',
    card ? cardBlock(card.name) : '',
    ...outro.map(paragraph),
    button ? buttonBlock(button) : '',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f8f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8f6"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE}">
    <tr><td style="padding:28px 32px 12px">${body}</td></tr>
    <tr><td style="padding:18px 32px 26px;border-top:1px solid ${LINE};font:13px/1.5 ${FONT};color:${MUTED}">
      Semaine de l’industrie 2026, du 16 au 22 novembre, au Togo.<br>
      Une question ? <a href="mailto:${CONTACT}" style="color:${FOREST}">${CONTACT}</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    'Bonjour,',
    '',
    ...intro.map(plain),
    ...(code ? ['', `Votre code de suivi : ${code}`] : []),
    ...(details.length ? ['', ...details.map(([label, value]) => `${label} : ${value}`)] : []),
    ...(outro.length ? ['', ...outro.map(plain)] : []),
    ...(button ? ['', `${button.label} : ${button.url}`] : []),
    '',
    `Semaine de l’industrie 2026, du 16 au 22 novembre, au Togo. Une question ? ${CONTACT}`,
  ].join('\n');

  const attachments = card
    ? [{
      filename: `carte-qr-${card.fileCode}.png`,
      content: card.png,
      cid: CARD_CID,
      contentType: 'image/png',
    }]
    : [];

  return { subject, text, html, attachments };
}

/* Modèles d'e-mails ; `site` permet de viser l'adresse de production depuis un test. */
function emails(site = env.PUBLIC_APP_URL) {
  const base = String(site).replace(/\/$/, '');
  /* Bouton vers le dossier. */
  const space = (code) => ({ label: 'Ouvrir Mon espace', url: `${base}/mon-espace?code=${encodeURIComponent(code)}` });
  const FOLLOW = 'Suivez l’état de votre dossier à tout moment dans Mon espace, avec ce code.';
  const refusedOutro = [`Pour en savoir plus, écrivez à l’équipe d’organisation : ${CONTACT}.`];

  return {
    /* École : inscription reçue. */
    schoolReceived: ({ name, code, city, headcount, registeredOn }) => buildEmail({
      subject: `Inscription en cours de validation : ${name}`,
      intro: [`Nous avons bien reçu la participation de **${name}** à la Semaine de l’industrie 2026. Elle est **en cours de validation** par l’équipe d’organisation.`],
      code,
      details: [
        ['Établissement', name],
        ...(city ? [['Ville', city]] : []),
        ...(headcount ? [['Effectif déclaré', `${headcount} personnes`]] : []),
        ...(registeredOn ? [['Inscription', registeredOn]] : []),
        ['Statut', 'En cours de validation'],
      ],
      outro: [FOLLOW, 'Vous recevrez une réponse par e-mail et sur WhatsApp.'],
      button: space(code),
    }),

    /* École : inscription acceptée, avec la carte QR. */
    schoolApproved: ({ name, code, places, cardPng }) => buildEmail({
      subject: `Participation acceptée : ${name}`,
      intro: [`La participation de **${name}** à la Semaine de l’industrie 2026 a été **acceptée**.`],
      code,
      details: [['Établissement', name], ['Places accordées', String(places)], ['Statut', 'Acceptée']],
      card: { name, png: cardPng, fileCode: code },
      outro: ['Votre carte QR est jointe à ce message : présentez-la à l’entrée des sites.', 'Vous serez prévenu dès qu’une visite sera arrangée.'],
      button: space(code),
    }),

    /* École : inscription refusée. */
    schoolRejected: ({ name }) => buildEmail({
      subject: `Participation non retenue : ${name}`,
      intro: [`La participation de **${name}** à la Semaine de l’industrie 2026 **n’a pas été acceptée**.`],
      outro: refusedOutro,
    }),

    /* Particulier : inscription reçue. */
    individualReceived: ({ name, code }) => buildEmail({
      subject: 'Votre inscription est en cours de validation',
      intro: [`Nous avons bien reçu l’inscription de **${name}** à la Semaine de l’industrie 2026. Elle est **en cours de validation** par l’équipe d’organisation.`],
      code,
      outro: [FOLLOW, 'Vous recevrez une réponse par e-mail et sur WhatsApp.'],
      button: space(code),
    }),

    /* Particulier : inscription acceptée, avec la carte QR. */
    individualApproved: ({ name, code, cardPng }) => buildEmail({
      subject: 'Votre inscription est acceptée',
      intro: [`L’inscription de **${name}** à la Semaine de l’industrie 2026 a été **acceptée**.`],
      code,
      card: { name, png: cardPng, fileCode: code },
      outro: ['Votre carte QR est jointe à ce message : présentez-la à l’entrée des sites.'],
      button: space(code),
    }),

    /* Particulier : inscription refusée. */
    individualRejected: ({ name }) => buildEmail({
      subject: 'Votre inscription n’a pas été retenue',
      intro: [`L’inscription de **${name}** à la Semaine de l’industrie 2026 **n’a pas été acceptée**.`],
      outro: refusedOutro,
    }),

    /* Industrie : demande de label reçue. */
    labelReceived: ({ name, code }) => buildEmail({
      subject: `Demande de label en cours d’examen : ${name}`,
      intro: [`Nous avons bien reçu la demande de label de **${name}**. Elle est **en cours d’examen** par l’équipe d’organisation.`],
      code,
      outro: [FOLLOW, 'Vous recevrez une réponse par e-mail et sur WhatsApp.'],
      button: space(code),
    }),

    /* Industrie : label accordé, avec la carte QR. */
    labelApproved: ({ name, code, cardPng }) => buildEmail({
      subject: `Label accordé : ${name}`,
      intro: [`La demande de label de **${name}** a été **acceptée**.`],
      code,
      card: { name, png: cardPng, fileCode: code },
      outro: [
        'Votre carte QR est jointe à ce message : elle mène à votre fiche publique.',
        'Gardez votre code pour vous : il sert à valider les passages des visiteurs sur votre site.',
        'Vous serez prévenu quand une visite sera programmée.',
      ],
      button: space(code),
    }),

    /* Industrie : label refusé. */
    labelRejected: ({ name }) => buildEmail({
      subject: `Demande de label non retenue : ${name}`,
      intro: [`La demande de label de **${name}** **n’a pas été acceptée**.`],
      outro: refusedOutro,
    }),

    /* Rencontres d'affaires : inscription reçue. */
    businessReceived: ({ name, code }) => buildEmail({
      subject: `Rencontres d’affaires, inscription en cours de validation : ${name}`,
      intro: [`Nous avons bien reçu l’inscription de **${name}** aux rencontres d’affaires. Elle est **en cours de validation** par l’équipe d’organisation.`],
      code,
      outro: [FOLLOW, 'Vous recevrez une réponse par e-mail et sur WhatsApp.'],
      button: space(code),
    }),

    /* Rencontres d'affaires : inscription acceptée. */
    businessApproved: ({ name, code }) => buildEmail({
      subject: `Rencontres d’affaires, inscription acceptée : ${name}`,
      intro: [`L’inscription de **${name}** aux rencontres d’affaires a été **acceptée**.`],
      code,
      outro: ['Vous serez prévenu dès qu’un rendez-vous sera fixé.'],
      button: space(code),
    }),

    /* Rencontres d'affaires : inscription refusée. */
    businessRejected: ({ name }) => buildEmail({
      subject: `Rencontres d’affaires, inscription non retenue : ${name}`,
      intro: [`L’inscription de **${name}** aux rencontres d’affaires **n’a pas été acceptée**.`],
      outro: refusedOutro,
    }),

    /* Rendez-vous d'affaires fixé ou reporté. */
    meeting: ({ code, day, slot, place, others, rescheduled = false }) => buildEmail({
      subject: rescheduled ? `Rendez-vous reporté au ${day}` : `Rendez-vous confirmé le ${day}`,
      intro: [rescheduled ? 'Votre rendez-vous d’affaires a été **reporté**.' : 'Votre rendez-vous d’affaires est **confirmé**.'],
      details: [['Date', day], ['Horaire', slot], ['Lieu', place], ['Avec', others]],
      button: code ? space(code) : null,
    }),

    /* École : visite programmée. */
    schoolVisit: ({ code, day, slot, site }) => buildEmail({
      subject: `Visite confirmée le ${day} : ${site}`,
      intro: [`Votre visite chez **${site}** est **confirmée**.`],
      details: [['Date', day], ['Horaire', slot], ['Lieu', site]],
      button: code ? space(code) : null,
    }),

    /* Industrie : visite à accueillir. */
    siteVisit: ({ code, day, slot, school, headcount }) => buildEmail({
      subject: `Visite à accueillir le ${day} : ${school}`,
      intro: [`L’établissement **${school}** visitera votre site.`],
      details: [['Date', day], ['Horaire', slot], ['Établissement', school], ['Effectif prévu', `${headcount} personnes`]],
      button: code ? space(code) : null,
    }),

    /* Rappel d'une visite. */
    visitReminder: ({ code, day, slot, place }) => buildEmail({
      subject: `Rappel : visite du ${day}`,
      intro: ['Voici un rappel pour votre visite. Merci de vous présenter à l’heure indiquée.'],
      details: [['Date', day], ['Horaire', slot], ['Lieu', place]],
      button: code ? space(code) : null,
    }),
  };
}

module.exports = { emails };
