'use strict';

/* Ajoute les industries labellisées fournies par l'organisation (nom, position, description).
   Sans option, liste seulement ce qui serait ajouté ; --apply écrit en base.
   Une industrie déjà présente (même nom) est ignorée : le script peut être relancé sans doublon. */
const { sequelize, Organization } = require('../src/models');
const trackingService = require('../src/modules/tracking/tracking.service');

const apply = process.argv.includes('--apply');

const INDUSTRIES = [
  ['SIVOP', 6.145055, 1.269602, 'Industrie cosmétique implantée depuis de longues années en zone portuaire, SIVOP fabrique une large gamme de produits de soin et de parfumerie. Elle est aussi présente dans plusieurs pays africains.'],
  ['ORYX Énergie', 6.153124, 1.297624, 'Acteur du secteur énergétique, ORYX exploite au port de Lomé une unité de production de lubrifiants. Celle-ci approvisionne le marché togolais et la sous-région.'],
  ['INDUFOOD', 6.147631, 1.270110, 'Entreprise agroalimentaire de la zone portuaire, spécialisée dans la transformation et la fabrication de produits alimentaires. Elle illustre le dynamisme de l’agro-industrie locale.'],
  ['RODIS', 6.153931, 1.299981, 'Entreprise industrielle installée en zone portuaire, active dans la fabrication de produits de consommation courante. La visite permet de découvrir un outil de production orienté vers le marché local et régional.'],
  ['SOTOTOLE', 6.160696, 1.299002, 'Industrie métallurgique présente depuis plus de trente ans, SOTOTOLE produit des tôles et divers produits en acier pour le bâtiment. Ses produits sont bien connus sur les chantiers togolais.'],
  ['FUFUMIX', 6.236056, 1.181156, 'Entreprise togolaise née de l’innovation locale, connue pour sa machine Foufoumix qui remplace le pilage traditionnel. Elle conçoit et fabrique des équipements adaptés aux besoins africains.'],
  ['MATRIX', 6.162236, 1.235258, 'Jeune entreprise technologique qui conçoit et assemble à Lomé des ordinateurs et accessoires informatiques sous sa propre marque. Elle mise sur le savoir-faire de jeunes techniciens togolais.'],
  ['MASTER EQUIPMENT', 6.378855, 1.218995, 'Entreprise industrielle spécialisée dans la fabrication de matériel et d’équipements. Elle contribue au développement de la production locale dans le grand Lomé.'],
  ['GENERAL DOP INDUSTRIE', 6.335205, 1.217703, 'Industrie installée sur la Plateforme industrielle d’Adétikopé (PIA), active dans la transformation des plastiques. Elle fait partie de la nouvelle génération d’investisseurs de la plateforme.'],
  ['VIVACE GROUPE', 6.345401, 1.253520, 'Industrie implantée sur la PIA, qui fabrique des matériaux de construction en aluminium et en plastique. Cet investissement important crée de nombreux emplois pour les jeunes.'],
  ['CIMCO', 6.148721, 1.289129, 'Cimenterie moderne de grande capacité, installée dans la zone portuaire de Lomé. Elle approvisionne en ciment le Togo et les pays voisins grâce à sa proximité avec le port.'],
  ['JUS DELICE', 6.470075, 1.300085, 'Unité de transformation de fruits implantée dans la région de Tsévié, qui valorise notamment l’ananas togolais. Une partie de sa production est destinée à l’exportation.'],
  ['STAR GARMENT', 6.338177, 1.223328, 'Usine de confection textile de dimension internationale, installée sur la PIA. Elle fabrique des vêtements pour de grandes marques et emploie de nombreux jeunes Togolais.'],
];

/* Même règle que les fiches acceptées depuis le back-office. */
function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/* Slug libre : ajoute -2, -3… si le nom est déjà pris. */
async function uniqueSlug(name, transaction) {
  const base = slugify(name) || 'industrie';
  let slug = base;
  for (let i = 2; await Organization.findOne({ where: { slug }, transaction }); i += 1) slug = `${base}-${i}`;
  return slug;
}

async function main() {
  const existing = await Organization.findAll({ attributes: ['name'] });
  const known = new Set(existing.map((o) => o.name.trim().toLowerCase()));
  const todo = INDUSTRIES.filter(([name]) => !known.has(name.toLowerCase()));

  for (const [name] of INDUSTRIES) {
    console.log(`${known.has(name.toLowerCase()) ? 'déjà présente' : apply ? 'ajoutée     ' : 'à ajouter   '}  ${name}`);
  }
  if (!apply) {
    console.log(`\n${todo.length} industrie(s) à ajouter. Relancer avec --apply pour écrire en base.`);
    return;
  }

  await sequelize.transaction(async (transaction) => {
    for (const [name, lat, lng, description] of todo) {
      await Organization.create({
        name,
        slug: await uniqueSlug(name, transaction),
        type: 'entreprise',
        lat,
        lng,
        description,
        products: [],
        gallery_urls: [],
        kit_files: [],
        visit_slots: [],
        label_code: await trackingService.nextCode('IN', transaction),
        label_status: 'approved',
        labeled_at: new Date(),
        is_active: true,
      }, { transaction });
    }
  });
  console.log(`\n${todo.length} industrie(s) ajoutée(s).`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
