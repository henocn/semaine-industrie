'use strict';

const TIME_ZONE = 'Africa/Lome';

/* Journées du Palais des Congrès ouvertes à l'inscription des particuliers. */
const PALAIS_DAYS = [
  { n: 16, date: '2026-11-16', label: 'Lundi 16 novembre', title: 'L’ouverture', place: 'Grande salle', hours: 'à partir de 8h30' },
  { n: 17, date: '2026-11-17', label: 'Mardi 17 novembre', title: 'Le forum des métiers', place: 'Grande salle', hours: 'de 14h à 16h45' },
  { n: 18, date: '2026-11-18', label: 'Mercredi 18 novembre', title: 'Les femmes dans l’industrie', place: 'Salle polyvalente', hours: 'de 9h à 10h45' },
];

const DAY_NUMBERS = PALAIS_DAYS.map((day) => day.n);

/* Garde les journées connues, sans doublon, dans l'ordre. */
function normalizeDays(value) {
  const list = Array.isArray(value) ? value : [];
  return DAY_NUMBERS.filter((n) => list.map(Number).includes(n));
}

/* Fiche d'une journée par son numéro. */
function dayInfo(n) {
  return PALAIS_DAYS.find((day) => day.n === Number(n)) || null;
}

/* Journées en clair, une par ligne : « Lundi 16 novembre, l’ouverture (grande salle, à partir de 8h30) ». */
function daysLines(days) {
  return normalizeDays(days).map((n) => {
    const day = dayInfo(n);
    return `${day.label}, ${day.title.charAt(0).toLowerCase()}${day.title.slice(1)} (${day.place.toLowerCase()}, ${day.hours})`;
  });
}

/* Journées en version courte : « lundi 16, mercredi 18 ». */
function daysShort(days) {
  return normalizeDays(days)
    .map((n) => dayInfo(n).label.replace(/ novembre$/, '').toLowerCase())
    .join(', ');
}

/* Journée du Palais qui a lieu aujourd'hui à Lomé, ou null. */
function todayDay(now = new Date()) {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now);
  return PALAIS_DAYS.find((day) => day.date === iso)?.n ?? null;
}

module.exports = {
  PALAIS_DAYS,
  DAY_NUMBERS,
  normalizeDays,
  dayInfo,
  daysLines,
  daysShort,
  todayDay,
};
