'use strict';

const START = 2001;

/* Attribue des codes séquentiels à une liste déjà triée. */
async function assignCodes(queryInterface, rows, updateSql) {
  let last = START - 1;
  for (const row of rows) {
    last += 1;
    const code = `${row.prefix}-${String(last).padStart(4, '0')}`;
    await queryInterface.sequelize.query(updateSql, {
      replacements: { id: row.id, code },
    });
  }
  return last;
}

module.exports = {
  /* Ajoute legacy_code, convertit les codes existants, crée le compteur. */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tracking_counters', {
      prefix: { type: Sequelize.STRING(2), allowNull: false, primaryKey: true },
      last_value: { type: Sequelize.INTEGER, allowNull: false },
    });

    await queryInterface.addColumn('organizations', 'legacy_code', {
      type: Sequelize.STRING(40),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('passports', 'legacy_code', {
      type: Sequelize.STRING(40),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('business_participants', 'legacy_code', {
      type: Sequelize.STRING(40),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('business_participants', 'tracking_code', {
      type: Sequelize.STRING(16),
      allowNull: true,
      unique: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE organizations
      SET legacy_code = label_code
      WHERE label_code IS NOT NULL AND legacy_code IS NULL
    `);
    await queryInterface.sequelize.query(`
      UPDATE passports
      SET legacy_code = code
      WHERE code IS NOT NULL AND legacy_code IS NULL
    `);

    const [orgs] = await queryInterface.sequelize.query(`
      SELECT id, type, created_at
      FROM organizations
      WHERE label_code IS NOT NULL
      ORDER BY created_at ASC, id ASC
    `);
    const [passports] = await queryInterface.sequelize.query(`
      SELECT id, kind, created_at
      FROM passports
      ORDER BY created_at ASC, id ASC
    `);
    const [participants] = await queryInterface.sequelize.query(`
      SELECT id, created_at
      FROM business_participants
      ORDER BY created_at ASC, id ASC
    `);

    const byTime = (a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    };

    const ecRows = [
      ...orgs.filter((row) => row.type === 'ecole').map((row) => ({ ...row, prefix: 'EC', table: 'org' })),
      ...passports.filter((row) => row.kind === 'group').map((row) => ({ ...row, prefix: 'EC', table: 'pass' })),
    ].sort(byTime);

    let lastEc = START - 1;
    for (const row of ecRows) {
      lastEc += 1;
      const code = `EC-${String(lastEc).padStart(4, '0')}`;
      if (row.table === 'org') {
        await queryInterface.sequelize.query(
          'UPDATE organizations SET label_code = :code WHERE id = :id',
          { replacements: { id: row.id, code } },
        );
      } else {
        await queryInterface.sequelize.query(
          'UPDATE passports SET code = :code WHERE id = :id',
          { replacements: { id: row.id, code } },
        );
      }
    }

    const lastIn = await assignCodes(
      queryInterface,
      orgs.filter((row) => row.type !== 'ecole').map((row) => ({ ...row, prefix: 'IN' })),
      'UPDATE organizations SET label_code = :code WHERE id = :id',
    );
    const lastPa = await assignCodes(
      queryInterface,
      passports.filter((row) => row.kind !== 'group').map((row) => ({ ...row, prefix: 'PA' })),
      'UPDATE passports SET code = :code WHERE id = :id',
    );
    const lastAf = await assignCodes(
      queryInterface,
      participants.map((row) => ({ ...row, prefix: 'AF' })),
      'UPDATE business_participants SET tracking_code = :code WHERE id = :id',
    );

    await queryInterface.bulkInsert('tracking_counters', [
      { prefix: 'EC', last_value: lastEc },
      { prefix: 'PA', last_value: lastPa },
      { prefix: 'AF', last_value: lastAf },
      { prefix: 'IN', last_value: lastIn },
    ]);
  },

  /* Restaure les anciens codes et retire les colonnes. */
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE organizations
      SET label_code = legacy_code
      WHERE legacy_code IS NOT NULL
    `);
    await queryInterface.sequelize.query(`
      UPDATE passports
      SET code = legacy_code
      WHERE legacy_code IS NOT NULL
    `);

    await queryInterface.removeColumn('business_participants', 'tracking_code');
    await queryInterface.removeColumn('business_participants', 'legacy_code');
    await queryInterface.removeColumn('passports', 'legacy_code');
    await queryInterface.removeColumn('organizations', 'legacy_code');
    await queryInterface.dropTable('tracking_counters');
  },
};
