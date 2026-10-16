'use strict';

const { v4: uuidv4 } = require('uuid');

const SITES = [
  {
    name: 'Usine Demo Lomé',
    slug: 'usine-demo-lome',
    type: 'entreprise',
    sector: 'Agroalimentaire',
    region: 'Maritime',
    city: 'Lomé',
    lat: 6.1319,
    lng: 1.2228,
    products: ['farine', 'huile'],
    label_code: 'SI-DEMO-LOME',
  },
  {
    name: 'Minoterie Kara',
    slug: 'minoterie-kara',
    type: 'entreprise',
    sector: 'Agroalimentaire',
    region: 'Kara',
    city: 'Kara',
    lat: 9.5511,
    lng: 1.1861,
    products: ['céréales'],
    label_code: 'SI-DEMO-KARA',
  },
  {
    name: 'Atelier textile Sokodé',
    slug: 'atelier-textile-sokode',
    type: 'entreprise',
    sector: 'Textile',
    region: 'Centrale',
    city: 'Sokodé',
    lat: 8.9833,
    lng: 1.1333,
    products: ['tissus'],
    label_code: 'SI-DEMO-SOKODE',
  },
  {
    name: 'Lycée technique d’Atakpamé',
    slug: 'lycee-technique-atakpame',
    type: 'ecole',
    sector: 'Formation',
    region: 'Plateaux',
    city: 'Atakpamé',
    lat: 7.5333,
    lng: 1.1333,
    products: [],
    label_code: 'SI-DEMO-ATAK',
  },
];

/* Sites labellisés démo avec coordonnées (carte). */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    for (const site of SITES) {
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id FROM organizations WHERE slug = :slug LIMIT 1',
        { replacements: { slug: site.slug } },
      );

      const payload = {
        name: site.name,
        type: site.type,
        sector: site.sector,
        region: site.region,
        city: site.city,
        lat: site.lat,
        lng: site.lng,
        products: JSON.stringify(site.products),
        label_code: site.label_code,
        label_status: 'approved',
        labeled_at: now,
        visit_slots: JSON.stringify([{ day: '2026-11-18', start: '09:00', end: '12:00' }]),
        max_visitors: 40,
        is_active: true,
        contact_name: 'Référent démo',
        contact_email: 'demo@semaine-industrie.tg',
        updated_at: now,
      };

      if (rows.length) {
        await queryInterface.bulkUpdate('organizations', payload, { slug: site.slug });
      } else {
        await queryInterface.bulkInsert('organizations', [
          {
            id: uuidv4(),
            slug: site.slug,
            description: 'Site de démonstration Semaine de l’industrie 2026.',
            safety_rules: 'Casque et chaussures fermées obligatoires.',
            created_at: now,
            ...payload,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DELETE FROM organizations WHERE slug IN (:slugs)',
      { replacements: { slugs: SITES.map((s) => s.slug) } },
    );
  },
};
