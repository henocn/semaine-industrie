'use strict';

/* Jeu de données de démonstration, pour la base LOCALE uniquement : npm run db:seed:demo
   N'efface rien et ne s'exécute qu'une fois. Passe par les modèles, donc aucun WhatsApp ni e-mail. */
const fs = require('fs');
const path = require('path');
const env = require('../src/config/env');
const {
  sequelize,
  Organization,
  LabelRequest,
  Participation,
  Passport,
  PassportVisit,
  VisitBooking,
  BusinessParticipant,
  BusinessMeeting,
  GlobalResource,
  VoteOption,
  VoteBallot,
  SurveyQuestion,
  SurveyResponse,
  GameResult,
  LiveQuestion,
  AuditEvent,
} = require('../src/models');
const { DOCS_DIR } = require('../src/middlewares/upload.middleware');

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const DB_HOST = process.env.DB_HOST || 'localhost';

if (env.NODE_ENV === 'production' || !LOCAL_HOSTS.includes(DB_HOST)) {
  console.error(`Seed refusé : réservé à une base locale (NODE_ENV=${env.NODE_ENV}, hôte=${DB_HOST}).`);
  process.exit(1);
}

/* Tirage reproductible : les mêmes données à chaque installation. */
let randomState = 20261116;
function random() {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];
const chance = (ratio) => random() < ratio;

/* Prend n éléments distincts. */
function sample(list, n) {
  const pool = [...list];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(between(0, pool.length - 1), 1)[0]);
  return out;
}

const pad = (n) => String(n).padStart(3, '0');
const slugify = (text) => text
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

/* Domaine réservé (example.com) : aucune adresse réelle. */
const emailOf = (name) => `${slugify(name).slice(0, 40)}@example.com`;
const phoneOf = (n) => `+22894${String(100000 + n).slice(-6)}`;

/* Date d'inscription entre le 10 octobre et le 3 novembre 2026. */
const signupDate = () => new Date(Date.UTC(2026, 9, between(10, 34), between(7, 19), between(0, 59)));

const WEEK = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];
const SLOTS = [['08:30', '10:30'], ['09:00', '12:00'], ['10:30', '12:30'], ['14:00', '16:00'], ['15:00', '17:00']];

const REGIONS = {
  Maritime: [['Lomé', 6.1319, 1.2228], ['Tsévié', 6.4261, 1.2133], ['Aného', 6.2333, 1.5917], ['Kpémé', 6.2106, 1.5272]],
  Plateaux: [['Atakpamé', 7.5333, 1.1333], ['Kpalimé', 6.9, 0.6333], ['Notsé', 6.95, 1.1667], ['Badou', 7.5833, 0.6]],
  Centrale: [['Sokodé', 8.9833, 1.1333], ['Sotouboua', 8.5667, 0.9833], ['Tchamba', 9.0333, 1.4167]],
  Kara: [['Kara', 9.5511, 1.1861], ['Bassar', 9.25, 0.7833], ['Niamtougou', 9.7681, 1.1053]],
  Savanes: [['Dapaong', 10.8622, 0.2077], ['Mango', 10.3592, 0.4706], ['Cinkassé', 11.0833, 0.0167]],
};

/* Noms fictifs : [nom, secteur, région, produits]. */
const INDUSTRIES = [
  ['Minoterie du Golfe', 'Agroalimentaire', 'Maritime', ['farine de blé', 'semoule']],
  ['Huilerie des Plateaux', 'Agroalimentaire', 'Plateaux', ['huile de palme', 'tourteaux']],
  ['Cimenterie de l’Oti', 'Matériaux de construction', 'Savanes', ['ciment', 'clinker']],
  ['Filature de Sokodé', 'Textile', 'Centrale', ['fil de coton', 'pagnes']],
  ['Conserverie Kara Fruits', 'Agroalimentaire', 'Kara', ['mangue séchée', 'jus']],
  ['Ateliers métalliques de Lomé', 'Métallurgie', 'Maritime', ['charpentes', 'portails']],
  ['Plastiques du Mono', 'Plasturgie', 'Maritime', ['bidons', 'emballages']],
  ['Savonnerie Agou', 'Cosmétique', 'Plateaux', ['savon noir', 'beurre de karité']],
  ['Laiterie des Savanes', 'Agroalimentaire', 'Savanes', ['yaourt', 'fromage peulh']],
  ['Céramique de Bassar', 'Matériaux de construction', 'Kara', ['briques', 'carreaux']],
  ['Brasserie du Port', 'Boissons', 'Maritime', ['eau minérale', 'sodas']],
  ['Égrenage de Notsé', 'Textile', 'Plateaux', ['coton fibre', 'graines']],
  ['Pharma Togo Sud', 'Pharmaceutique', 'Maritime', ['génériques', 'solutés']],
  ['Karité de Mango', 'Cosmétique', 'Savanes', ['beurre de karité', 'huiles']],
  ['Menuiserie industrielle de Kpalimé', 'Bois', 'Plateaux', ['mobilier scolaire', 'portes']],
  ['Papeterie de Tsévié', 'Papier et carton', 'Maritime', ['cartons', 'cahiers']],
  ['Soja Centrale', 'Agroalimentaire', 'Centrale', ['huile de soja', 'tourteaux']],
  ['Solaire Togo Assemblage', 'Énergie', 'Maritime', ['panneaux', 'kits solaires']],
  ['Fonderie de Kara', 'Métallurgie', 'Kara', ['pièces moulées', 'outils']],
  ['Cacao Kloto', 'Agroalimentaire', 'Plateaux', ['chocolat', 'beurre de cacao']],
  ['Tissage Tchamba', 'Textile', 'Centrale', ['kente', 'linge de maison']],
  ['Phosphates de Kpémé Services', 'Mines', 'Maritime', ['engrais', 'phosphate']],
  ['Conditionnement Dapaong', 'Agroalimentaire', 'Savanes', ['riz', 'mil']],
  ['Chaudronnerie du Port', 'Métallurgie', 'Maritime', ['cuves', 'réservoirs']],
];

const SCHOOLS = [
  ['Lycée technique d’Adidogomé', 'Maritime', 'Lomé'],
  ['Université de Lomé, École polytechnique', 'Maritime', 'Lomé'],
  ['Centre de formation des métiers de Tsévié', 'Maritime', 'Tsévié'],
  ['Lycée scientifique d’Aného', 'Maritime', 'Aného'],
  ['Lycée technique de Kpalimé', 'Plateaux', 'Kpalimé'],
  ['Institut agricole de Notsé', 'Plateaux', 'Notsé'],
  ['Collège d’enseignement technique d’Atakpamé', 'Plateaux', 'Atakpamé'],
  ['Lycée de Sokodé', 'Centrale', 'Sokodé'],
  ['Centre des métiers de Sotouboua', 'Centrale', 'Sotouboua'],
  ['Université de Kara, Faculté des sciences', 'Kara', 'Kara'],
  ['Lycée technique de Kara', 'Kara', 'Kara'],
  ['Lycée de Bassar', 'Kara', 'Bassar'],
  ['Lycée technique de Dapaong', 'Savanes', 'Dapaong'],
  ['Centre de formation de Mango', 'Savanes', 'Mango'],
];

const PEOPLE = [
  'Afi Mensah', 'Komi Agbeko', 'Ama Dossou', 'Kossi Amouzou', 'Yawa Lawson', 'Edem Kpodar', 'Akossiwa Tchalla',
  'Mawuli Sodji', 'Essi Adjovi', 'Kokou Attisso', 'Dzifa Ayivi', 'Sena Akakpo', 'Bawa Koffi', 'Pakam Essozimna',
  'Nadia Boukari', 'Issifou Tchédré', 'Fati Ouro-Sama', 'Rachida Alassani', 'Abla Gbati', 'Kafui Hounkpati',
  'Tanguy Ekué', 'Larissa Djondo', 'Sélom Kuevi', 'Mariam Traoré', 'Enyonam Dogbe', 'Yao Nyuiadzi', 'Delali Fiagan',
  'Wiyao Pidalatan', 'Massan Kudjo', 'Gafar Salifou', 'Akouvi Tengue', 'Dédé Aziaka', 'Kanfitin Lare', 'Lamboni Yendoubé',
  'Pyabalo Kpatcha', 'Elom Dzossou', 'Reine Amegee', 'Ayélé Sewa', 'Toyi Bakoma', 'Zakari Nassirou',
];

const INTERESTS = [
  'Découvrir les métiers de la maintenance.',
  'Trouver un stage dans l’agroalimentaire.',
  'Comprendre comment on fabrique au Togo.',
  'Orienter mon enfant vers une filière technique.',
  'Rencontrer des industriels de ma région.',
  null,
];

const SAFETY = 'Chaussures fermées obligatoires. Casque et gilet fournis à l’entrée. Photos sur autorisation.';

/* Fabrique un PDF minimal et valide, pour que les téléchargements fonctionnent. */
function minimalPdf(title) {
  const ascii = (text) => text
    .normalize('NFD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/([()\\])/g, '\\$1');
  const stream = `BT /F1 20 Tf 60 760 Td (${ascii(title)}) Tj 0 -32 Td /F1 12 Tf (Document de demonstration - Semaine de l'industrie 2026) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const at = body.length;
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return at;
  });
  const xref = body.length;
  const rows = offsets.map((at) => `${String(at).padStart(10, '0')} 00000 n \n`).join('');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${rows}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return body;
}

/* Écrit un PDF de démonstration et renvoie son URL publique. */
function writeDoc(filename, title) {
  fs.writeFileSync(path.join(DOCS_DIR, filename), minimalPdf(title), 'latin1');
  return `/uploads/docs/${filename}`;
}

/* Sites industriels, écoles et demandes de label. */
async function seedOrganizations(transaction) {
  const labelUrl = writeDoc('demo-label-si26.pdf', 'Label Semaine de l industrie 2026');
  const kitUrl = writeDoc('demo-kit-communication.pdf', 'Kit de communication du label');
  const photos = ['/images/atelier.jpg', '/images/atelier-textile.jpg', '/images/hall.jpg', '/images/hero-usine.jpg', '/images/hero-cimenterie.jpg'];

  const industries = [];
  for (const [i, [name, sector, region, products]] of INDUSTRIES.entries()) {
    const [city, lat, lng] = pick(REGIONS[region]);
    const createdAt = signupDate();
    const kit = i % 3 === 2 ? [] : [
      { id: `demo-label-${i}`, name: 'Label SI26', url: labelUrl, mime: 'application/pdf', size: null },
      { id: `demo-kit-${i}`, name: 'Kit de communication', url: kitUrl, mime: 'application/pdf', size: null },
    ];
    const slots = sample(WEEK, between(2, 4)).sort().map((day) => {
      const [start, end] = pick(SLOTS);
      return { day, start, end };
    });
    const photo = pick(photos);
    const fields = {
      name,
      sector,
      region,
      city,
      lat: lat + (random() - 0.5) / 50,
      lng: lng + (random() - 0.5) / 50,
      address: `Zone industrielle de ${city}`,
      contact_name: pick(PEOPLE),
      contact_email: emailOf(name),
      contact_phone: phoneOf(i + 1),
      description: `${name} produit ${products.join(' et ')} à ${city} et ouvre ses ateliers pendant la Semaine.`,
      products,
      photo_url: photo,
      gallery_urls: [photo],
      max_visitors: i === 0 ? 200 : pick([40, 60, 80, 120]),
      visit_slots: slots,
      safety_rules: SAFETY,
    };
    const org = await Organization.create({
      ...fields,
      slug: `demo-${slugify(name)}`,
      type: 'entreprise',
      label_code: `IN-D${pad(i + 1)}`,
      kit_files: kit,
      label_document_url: kit[0]?.url || null,
      label_status: 'approved',
      labeled_at: new Date(createdAt.getTime() + 3 * 86400000),
      is_active: true,
      createdAt,
    }, { transaction });
    await LabelRequest.create({
      ...fields,
      organization_id: org.id,
      structure_name: name,
      structure_type: 'entreprise',
      contact_opt_in: true,
      status: 'approved',
      reviewed_at: org.labeled_at,
      createdAt,
    }, { transaction });
    industries.push(org);
  }

  /* Demandes encore à traiter ou refusées, sans fiche publique. */
  const waiting = [
    ['Rizerie de Mango', 'Agroalimentaire', 'Savanes'], ['Atelier Bois d’Agou', 'Bois', 'Plateaux'],
    ['Teinturerie de Kara', 'Textile', 'Kara'], ['Boulangerie industrielle du Grand Lomé', 'Agroalimentaire', 'Maritime'],
    ['Recyclage Plastique Togo', 'Plasturgie', 'Maritime'], ['Forges de Sotouboua', 'Métallurgie', 'Centrale'],
    ['Miel des Savanes', 'Agroalimentaire', 'Savanes'], ['Gaz Industriels du Sud', 'Énergie', 'Maritime'],
    ['Vanneries de Kpalimé', 'Artisanat industriel', 'Plateaux'], ['Biscuiterie Lomé Nord', 'Agroalimentaire', 'Maritime'],
    ['Peintures de Baguida', 'Chimie', 'Maritime'], ['Câbles du Togo', 'Électricité', 'Maritime'],
    ['Négoce Ouest Afrique', 'Commerce', 'Maritime'], ['Studio Graphique Lomé', 'Services', 'Maritime'],
    ['Transit Rapide', 'Logistique', 'Maritime'], ['Boutique Élégance', 'Commerce', 'Kara'],
  ];
  for (const [i, [name, sector, region]] of waiting.entries()) {
    const refused = i >= 12;
    const [city, lat, lng] = pick(REGIONS[region]);
    const createdAt = signupDate();
    await LabelRequest.create({
      structure_name: name,
      structure_type: 'entreprise',
      sector,
      region,
      city,
      lat,
      lng,
      contact_name: pick(PEOPLE),
      contact_email: emailOf(name),
      contact_phone: phoneOf(100 + i),
      contact_opt_in: true,
      description: `${name} souhaite ouvrir son site pendant la Semaine de l’industrie.`,
      products: [],
      max_visitors: pick([20, 30, 50]),
      status: refused ? 'rejected' : 'pending',
      review_note: refused ? 'Activité sans site de production à visiter.' : null,
      reviewed_at: refused ? new Date(createdAt.getTime() + 2 * 86400000) : null,
      createdAt,
    }, { transaction });
  }

  const schools = [];
  for (const [i, [name, region, city]] of SCHOOLS.entries()) {
    const coords = REGIONS[region].find(([c]) => c === city) || REGIONS[region][0];
    const headcount = between(18, 45);
    const createdAt = signupDate();
    const org = await Organization.create({
      name,
      slug: `demo-${slugify(name)}`,
      type: 'ecole',
      sector: 'Formation',
      region,
      city,
      lat: coords[1],
      lng: coords[2],
      contact_name: pick(PEOPLE),
      contact_email: emailOf(name),
      contact_phone: phoneOf(200 + i),
      products: [],
      label_code: `EC-S${pad(i + 1)}`,
      label_status: 'approved',
      labeled_at: new Date(createdAt.getTime() + 2 * 86400000),
      max_visitors: headcount,
      is_active: true,
      createdAt,
    }, { transaction });
    schools.push(org);
  }
  return { industries, schools };
}

/* Tampon de passage horodaté dans le créneau de la visite. */
function passageTime(day, start) {
  const [hour, minute] = start.split(':').map(Number);
  return new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute + between(0, 25)).padStart(2, '0')}:00Z`);
}

/* Écoles : inscription, code EC-, visites planifiées et passages. */
async function seedSchools({ industries, schools }, transaction) {
  const load = new Map();
  let bookings = 0;
  let visits = 0;
  const passports = [];

  for (const [i, school] of schools.entries()) {
    const createdAt = signupDate();
    const passport = await Passport.create({
      code: `EC-D${pad(i + 1)}`,
      kind: 'group',
      holder_name: school.name,
      school_name: school.name,
      headcount: school.max_visitors,
      school_organization_id: school.id,
      createdAt,
    }, { transaction });
    passports.push(passport);
    await Participation.create({
      kind: 'ecole',
      name: school.name,
      email: school.contact_email,
      phone: school.contact_phone,
      city: school.city,
      headcount: school.max_visitors,
      description: 'Visite d’usine pour nos élèves de fin de cycle.',
      status: 'approved',
      passport_id: passport.id,
      createdAt,
    }, { transaction });

    /* La première école a un parcours complet, la dernière n'a encore rien de prévu. */
    let count = between(3, 8);
    if (i === 0) count = 7;
    if (i === schools.length - 1) count = 0;
    const others = industries.slice(1);
    const sites = count ? [industries[0], ...sample(others, count - 1)] : [];
    let firstPassage = null;

    for (const [j, site] of sites.entries()) {
      const slot = pick(site.visit_slots);
      const key = `${site.id}|${slot.day}|${slot.start}`;
      const used = load.get(key) || 0;
      const fits = used + school.max_visitors <= site.max_visitors;
      let status = chance(0.08) ? 'cancelled' : (chance(0.1) ? 'pending' : 'confirmed');
      if (!fits) status = 'cancelled';
      if (i === 0) status = 'confirmed';
      if (status !== 'cancelled') load.set(key, used + school.max_visitors);

      await VisitBooking.create({
        organization_id: site.id,
        school_organization_id: school.id,
        school_name: school.name,
        teacher_name: school.contact_name,
        teacher_email: school.contact_email,
        teacher_phone: school.contact_phone,
        visit_day: slot.day,
        visit_start: slot.start,
        visit_end: slot.end,
        headcount: school.max_visitors,
        status,
        notes: chance(0.3) ? 'Prévoir un car et un accompagnateur par groupe de 15.' : null,
        createdAt,
      }, { transaction });
      bookings += 1;
      if (status !== 'confirmed') continue;

      /* Environ deux visites sur trois ont déjà eu lieu ; les autres gardent le tampon d'arrangement. */
      const happened = i === 0 ? j < 4 : chance(0.65);
      const at = happened ? passageTime(slot.day, slot.start) : createdAt;
      await PassportVisit.create({
        passport_id: passport.id,
        organization_id: site.id,
        scanned_by: happened ? site.label_code : 'arrangement orga',
        scanned_at: at,
      }, { transaction });
      visits += 1;
      if (happened && (!firstPassage || at < firstPassage)) firstPassage = at;
    }
    if (firstPassage) await passport.update({ passed_at: firstPassage }, { transaction });
  }

  /* Écoles sans fiche labellisée, à différents stades. */
  const extra = [
    ['École des métiers de Baguida', 'Lomé', 'approved'], ['Institut technique de Vogan', 'Vogan', 'approved'],
    ['Lycée de Tabligbo', 'Tabligbo', 'pending'], ['Collège technique de Kévé', 'Kévé', 'pending'],
    ['Lycée de Danyi', 'Danyi', 'pending'], ['Centre de formation d’Amlamé', 'Amlamé', 'pending'],
    ['Lycée de Blitta', 'Blitta', 'pending'], ['Cours privés du Plateau', 'Lomé', 'rejected'],
    ['Institut Horizon', 'Lomé', 'rejected'],
  ];
  for (const [i, [name, city, status]] of extra.entries()) {
    const createdAt = signupDate();
    const headcount = between(15, 40);
    const passport = status === 'approved'
      ? await Passport.create({
        code: `EC-D${pad(schools.length + i + 1)}`,
        kind: 'group',
        holder_name: name,
        school_name: name,
        headcount,
        createdAt,
      }, { transaction })
      : null;
    await Participation.create({
      kind: 'ecole',
      name,
      email: emailOf(name),
      phone: phoneOf(300 + i),
      city,
      headcount,
      description: 'Découverte de l’industrie pour nos classes de seconde.',
      status,
      passport_id: passport?.id || null,
      createdAt,
    }, { transaction });
  }
  return { bookings, visits, passports };
}

/* Particuliers : inscription, code PA- et passages. */
async function seedIndividuals({ industries }, transaction) {
  let visits = 0;
  const passports = [];
  for (const [i, name] of PEOPLE.entries()) {
    let status = 'approved';
    if (i >= 30) status = 'pending';
    if (i >= 36) status = 'rejected';
    const createdAt = signupDate();
    const passport = status === 'approved'
      ? await Passport.create({ code: `PA-D${pad(i + 1)}`, kind: 'individual', holder_name: name, createdAt }, { transaction })
      : null;
    await Participation.create({
      kind: 'particulier',
      name,
      email: chance(0.8) ? emailOf(name) : null,
      phone: phoneOf(400 + i),
      city: pick(['Lomé', 'Kara', 'Sokodé', 'Atakpamé', 'Kpalimé', 'Dapaong', 'Tsévié']),
      description: pick(INTERESTS),
      status,
      passport_id: passport?.id || null,
      createdAt,
    }, { transaction });
    if (!passport) continue;
    passports.push(passport);

    /* PA-D001 a un beau parcours, PA-D002 n'est passé nulle part. */
    let count = between(1, 6);
    if (i === 0) count = 5;
    if (i === 1) count = 0;
    let firstPassage = null;
    for (const site of sample(industries, count)) {
      const slot = pick(site.visit_slots);
      const at = passageTime(slot.day, slot.start);
      await PassportVisit.create({
        passport_id: passport.id,
        organization_id: site.id,
        scanned_by: site.label_code,
        scanned_at: at,
      }, { transaction });
      visits += 1;
      if (!firstPassage || at < firstPassage) firstPassage = at;
    }
    if (firstPassage) await passport.update({ passed_at: firstPassage }, { transaction });
  }
  return { visits, passports };
}

/* Rencontres d'affaires : participants et rendez-vous du vendredi 20. */
async function seedBusiness(transaction) {
  const companies = [
    'Sahel Invest', 'Golfe Capital', 'Agro Export Togo', 'Afrique Emballages', 'Lomé Négoce', 'Transports Kara',
    'Banque Régionale de Projets', 'Coopérative du Kloto', 'Solar Partners', 'Fonds Jeunes Industriels', 'Atlantique Logistique',
    'Bati Togo', 'Délices du Togo', 'Maintenance Pro', 'Ingénierie du Sud', 'Sourcing Ouest Afrique', 'Textiles Réunis',
    'Assurances du Golfe', 'Cabinet Conseil Ayité', 'Numérique Industrie', 'Équipements Agricoles Togo', 'Port Services',
    'Santé Plus Distribution', 'Céréales du Nord', 'Énergies Nouvelles', 'Export Karité', 'Grand Lomé Immobilier',
    'Cartons du Togo', 'Investir Ensemble', 'Commerce Sud-Sud',
  ];
  const sectors = ['Finance', 'Agroalimentaire', 'Logistique', 'Énergie', 'Textile', 'Services', 'BTP', 'Distribution'];
  const approved = [];
  let participants = 0;
  for (const [i, name] of companies.entries()) {
    let status = 'approved';
    if (i >= 22) status = 'pending';
    if (i >= 28) status = 'rejected';
    const row = await BusinessParticipant.create({
      kind: i % 7 === 6 ? 'particulier' : 'entreprise',
      organization_name: name,
      contact_name: pick(PEOPLE),
      email: emailOf(name),
      phone: phoneOf(500 + i),
      sector: pick(sectors),
      notes: pick(['Recherche des fournisseurs locaux.', 'Ouvert aux partenariats.', 'Finance des projets de transformation.', null]),
      status,
      contact_opt_in: true,
      tracking_code: status === 'pending' ? null : `AF-D${pad(i + 1)}`,
      createdAt: signupDate(),
    }, { transaction });
    participants += 1;
    if (status === 'approved') approved.push(row);
  }

  const notes = ['Accord de principe, devis à envoyer.', 'Échange prometteur, deuxième rendez-vous prévu.', 'Pas de suite pour le moment.'];
  let meetings = 0;
  for (let i = 0; i < 48; i += 1) {
    const hour = 9 + (i % 8);
    const minute = i % 16 < 8 ? '00' : '30';
    const start = new Date(`2026-11-20T${String(hour).padStart(2, '0')}:${minute}:00Z`);
    /* Le premier participant apparaît souvent, pour tester AF-D001. */
    const attendees = sample(approved, chance(0.2) ? 3 : 2);
    if (i % 5 === 0 && !attendees.includes(approved[0])) attendees[0] = approved[0];
    const status = chance(0.1) ? 'cancelled' : (chance(0.6) ? 'done' : 'scheduled');
    await BusinessMeeting.create({
      participant_a_id: attendees[0].id,
      participant_b_id: attendees[1].id,
      attendee_ids: attendees.map((a) => a.id),
      slot_start: start,
      slot_end: new Date(start.getTime() + 30 * 60000),
      table_label: `T${(i % 12) + 1}`,
      location: 'Salle des rencontres, Lomé',
      status,
      contact_note: status === 'done' ? pick(notes) : null,
      follow_up_at: status === 'done' && chance(0.4) ? new Date('2027-02-20T09:00:00Z') : null,
    }, { transaction });
    meetings += 1;
  }
  return { participants, meetings };
}

/* Documents publics de la page d'accueil. */
async function seedResources(transaction) {
  const hasProgramme = await GlobalResource.count({ where: { is_primary: true }, transaction });
  const docs = [
    ['Programme de la Semaine', 'demo-programme.pdf', !hasProgramme],
    ['Dossier de presse', 'demo-dossier-presse.pdf', false],
    ['Guide de visite d’usine', 'demo-guide-visite.pdf', false],
    ['Carte des sites ouverts', 'demo-carte-sites.pdf', false],
    ['Livret des métiers de l’industrie', 'demo-livret-metiers.pdf', false],
    ['Règles de sécurité sur site', 'demo-regles-securite.pdf', false],
  ];
  for (const [title, filename, isPrimary] of docs) {
    await GlobalResource.create({ title, file_url: writeDoc(filename, title), is_primary: isPrimary }, { transaction });
  }
  return docs.length;
}

/* Coup de cœur : produits en lice et votes. */
async function seedVotes({ industries }, transaction) {
  const options = [];
  for (const site of sample(industries, 8)) {
    const product = site.products[0];
    options.push(await VoteOption.create({
      label: `${product.charAt(0).toUpperCase()}${product.slice(1)}, ${site.name}`,
      description: `Fabriqué à ${site.city}.`,
      image_url: site.photo_url,
      organization_id: site.id,
      is_active: true,
    }, { transaction }));
  }
  /* Certains produits plaisent plus que d'autres. */
  const weighted = options.flatMap((option, i) => Array(i + 1).fill(option));
  const rows = Array.from({ length: 420 }, (_, i) => ({
    option_id: pick(weighted).id,
    voter_key: `demo-votant-${i + 1}`,
  }));
  await VoteBallot.bulkCreate(rows, { transaction });
  return { options: options.length, ballots: rows.length };
}

/* Réponses cohérentes avec les questions actives. */
function surveyAnswers(questions, phase) {
  const answers = {};
  for (const question of questions) {
    if (question.kind === 'choice') {
      answers[question.key] = pick(Array.isArray(question.options) ? question.options : []);
    } else {
      /* L'image de l'industrie s'améliore après la visite. */
      const base = phase === 'after' ? between(3, 5) : between(1, 4);
      answers[question.key] = base;
    }
  }
  return answers;
}

/* Sondage avant / après, jeux, questions en salle. */
async function seedEngagement(passports, transaction) {
  const questions = await SurveyQuestion.findAll({ where: { is_active: true }, transaction });
  let responses = 0;
  if (questions.length) {
    for (let i = 0; i < 180; i += 1) {
      const phase = i % 5 < 3 ? 'before' : 'after';
      await SurveyResponse.create({
        passport_id: chance(0.5) ? pick(passports).id : null,
        phase,
        answers: surveyAnswers(questions, phase),
        source: chance(0.85) ? 'qr' : 'paper',
        createdAt: signupDate(),
      }, { transaction });
      responses += 1;
    }
  }

  const games = [];
  for (let i = 0; i < 160; i += 1) {
    const answers = Array.from({ length: 5 }, () => between(0, 3));
    games.push({ game: 'quiz', answers, score: between(1, 5), profiles: [], createdAt: signupDate() });
  }
  for (let i = 0; i < 140; i += 1) {
    const answers = Array.from({ length: 5 }, () => between(0, 3));
    const profiles = chance(0.12) ? sample(['P1', 'P2', 'P3', 'P4'], 2) : [pick(['P1', 'P1', 'P2', 'P3', 'P3', 'P4'])];
    games.push({ game: 'talents', answers, score: null, profiles, createdAt: signupDate() });
  }
  await GameResult.bulkCreate(games, { transaction });

  const asked = [
    'Quelles aides pour une jeune entreprise de transformation ?',
    'Comment obtenir un stage dans une usine de ma région ?',
    'La zone franche est-elle ouverte aux PME ?',
    'Quelles formations pour devenir technicienne de maintenance ?',
    'Comment l’industrie peut-elle réduire ses déchets ?',
    'Où acheter des produits fabriqués au Togo ?',
    'Comment financer une petite unité de séchage ?',
    'Quelle place pour les femmes dans les usines ?',
    'Le label ouvre-t-il l’accès à des marchés publics ?',
    'Comment exporter vers les pays voisins ?',
    'Quels métiers vont recruter dans cinq ans ?',
    'Peut-on visiter une usine en dehors de la Semaine ?',
  ];
  for (const [i, body] of asked.entries()) {
    await LiveQuestion.create({
      session_key: 'forum',
      author_name: chance(0.7) ? pick(PEOPLE) : null,
      body,
      status: ['pending', 'approved', 'done', 'rejected'][i % 4],
    }, { transaction });
  }
  return { responses, games: games.length, questions: asked.length };
}

/* Journal d'audit, pour voir la page se remplir. */
async function seedAudit({ industries }, transaction) {
  const actions = [
    ['approve', 'label_request', 'a validé le label de'],
    ['update', 'organization', 'a modifié la fiche de'],
    ['create', 'visit_booking', 'a planifié une visite chez'],
    ['update', 'visit_booking', 'a déplacé une visite chez'],
  ];
  const rows = Array.from({ length: 60 }, () => {
    const [action, entityType, verb] = pick(actions);
    return {
      actor_email: 'demo.orga@example.com',
      actor_name: 'Équipe démo',
      action,
      entity_type: entityType,
      summary: `Équipe démo ${verb} ${pick(industries).name}`,
      createdAt: signupDate(),
    };
  });
  await AuditEvent.bulkCreate(rows, { transaction });
  return rows.length;
}

/* Lance le seed en une seule transaction : tout ou rien. */
async function main() {
  const already = await Organization.findOne({ where: { label_code: 'IN-D001' } });
  if (already) {
    console.log('Données de démonstration déjà présentes : rien à faire.');
    return;
  }

  const totals = await sequelize.transaction(async (transaction) => {
    const orgs = await seedOrganizations(transaction);
    const schools = await seedSchools(orgs, transaction);
    const people = await seedIndividuals(orgs, transaction);
    const business = await seedBusiness(transaction);
    const resources = await seedResources(transaction);
    const votes = await seedVotes(orgs, transaction);
    const engagement = await seedEngagement([...schools.passports, ...people.passports], transaction);
    const audit = await seedAudit(orgs, transaction);
    return {
      'Industries labellisées': orgs.industries.length,
      'Écoles labellisées': orgs.schools.length,
      'Visites planifiées': schools.bookings,
      'Passages et tampons': schools.visits + people.visits,
      'Participants affaires': business.participants,
      'Rendez-vous': business.meetings,
      Ressources: resources,
      'Produits en lice': votes.options,
      Votes: votes.ballots,
      'Réponses au sondage': engagement.responses,
      'Parties de jeux': engagement.games,
      'Questions en salle': engagement.questions,
      "Lignes d'audit": audit,
    };
  });

  console.table(totals);
  console.log('Codes à essayer dans Mon espace :');
  console.table({
    'École, parcours complet': 'EC-D001',
    'École, rien de prévu': 'EC-D014',
    'Particulier, 5 passages': 'PA-D001',
    'Particulier, aucun passage': 'PA-D002',
    'Industrie avec kit': 'IN-D001',
    'Industrie sans kit': 'IN-D003',
    'Rencontres d’affaires': 'AF-D001',
  });
}

main()
  .catch((err) => {
    console.error('Seed interrompu, rien n’a été enregistré :', err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
