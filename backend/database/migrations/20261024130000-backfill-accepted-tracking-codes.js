'use strict';

const START = 2001;

/* Attribue le prochain code du préfixe via le compteur (idempotent si déjà présent). */
async function nextCode(queryInterface, prefix) {
  const [rows] = await queryInterface.sequelize.query(
    `INSERT INTO tracking_counters (prefix, last_value)
     VALUES (:prefix, :start)
     ON CONFLICT (prefix) DO UPDATE
     SET last_value = tracking_counters.last_value + 1
     RETURNING last_value`,
    { replacements: { prefix, start: START } },
  );
  const last = rows[0]?.last_value;
  return `${prefix}-${String(last).padStart(4, '0')}`;
}

module.exports = {
  /* Crée les codes manquants pour les fiches déjà acceptées (EC, PA, AF, IN). */
  async up(queryInterface) {
    const [orgs] = await queryInterface.sequelize.query(`
      SELECT id, type
      FROM organizations
      WHERE label_status = 'approved'
        AND (label_code IS NULL OR btrim(label_code) = '')
      ORDER BY created_at ASC, id ASC
    `);
    for (const row of orgs) {
      const prefix = row.type === 'ecole' ? 'EC' : 'IN';
      const code = await nextCode(queryInterface, prefix);
      await queryInterface.sequelize.query(
        'UPDATE organizations SET label_code = :code WHERE id = :id',
        { replacements: { id: row.id, code } },
      );
    }

    const [parts] = await queryInterface.sequelize.query(`
      SELECT id, kind, name, headcount
      FROM participations
      WHERE status = 'approved'
        AND passport_id IS NULL
      ORDER BY created_at ASC, id ASC
    `);
    for (const row of parts) {
      const isSchool = row.kind === 'ecole';
      const code = await nextCode(queryInterface, isSchool ? 'EC' : 'PA');
      const [created] = await queryInterface.sequelize.query(
        `INSERT INTO passports (
           id, code, kind, holder_name, school_name, headcount, is_active, created_at, updated_at
         ) VALUES (
           gen_random_uuid(), :code, :kind, :holder_name, :school_name, :headcount, true, NOW(), NOW()
         )
         RETURNING id`,
        {
          replacements: {
            code,
            kind: isSchool ? 'group' : 'individual',
            holder_name: row.name,
            school_name: isSchool ? row.name : null,
            headcount: row.headcount || null,
          },
        },
      );
      await queryInterface.sequelize.query(
        'UPDATE participations SET passport_id = :passportId, updated_at = NOW() WHERE id = :id',
        { replacements: { id: row.id, passportId: created[0].id } },
      );
    }

    const [participants] = await queryInterface.sequelize.query(`
      SELECT id
      FROM business_participants
      WHERE status = 'approved'
        AND (tracking_code IS NULL OR btrim(tracking_code) = '')
      ORDER BY created_at ASC, id ASC
    `);
    for (const row of participants) {
      const code = await nextCode(queryInterface, 'AF');
      await queryInterface.sequelize.query(
        'UPDATE business_participants SET tracking_code = :code WHERE id = :id',
        { replacements: { id: row.id, code } },
      );
    }
  },

  /* Pas de rollback : les codes déjà attribués restent valides. */
  async down() {
    /* Intentionnellement vide : retirer les codes recréerait le trou Henoc a signalé. */
  },
};
