'use strict';

/* Profils proposés dans le formulaire d'accréditation (valeur stockée → libellé). */
const MEDIA_PROFILES = {
  journaliste: 'Journaliste',
  photographe: 'Photographe',
  videaste: 'Vidéaste',
  createur: 'Créateur de contenu',
  autre: 'Autre',
};

const PROFILE_VALUES = Object.keys(MEDIA_PROFILES);

/* Période couverte par l'accréditation. */
const MEDIA_VALIDITY = 'du lundi 16 au dimanche 22 novembre 2026';

/* Libellé d'un profil. */
function profileLabel(value) {
  return MEDIA_PROFILES[value] || MEDIA_PROFILES.autre;
}

/* Lien officiel (page de réseau social, site web) : « https:// » ajouté s'il manque ; '' si vide, null si invalide. */
function normalizeLink(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

/* Détail propre à la demande : média ou chaîne, profil et lien officiel. */
function pickDetails(payload) {
  const outlet = String(payload.media_outlet ?? '').trim();
  const profile = PROFILE_VALUES.includes(payload.media_profile) ? payload.media_profile : 'autre';
  const link = normalizeLink(payload.media_link);
  return link ? { outlet, profile, link } : { outlet, profile };
}

/* Résumé court : « Journaliste, Radio Lomé ». */
function summary(details) {
  const d = details || {};
  return [profileLabel(d.profile), d.outlet].filter(Boolean).join(', ');
}

module.exports = {
  MEDIA_PROFILES,
  PROFILE_VALUES,
  MEDIA_VALIDITY,
  profileLabel,
  normalizeLink,
  pickDetails,
  summary,
};
