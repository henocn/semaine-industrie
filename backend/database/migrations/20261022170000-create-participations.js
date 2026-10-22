'use strict';

const crypto = require('crypto');

/* Demandes de participation (écoles et particuliers), distinctes du label industrie. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('participations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      kind: {
        type: Sequelize.ENUM('ecole', 'particulier'),
        allowNull: false,
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      email: { type: Sequelize.STRING(180), allowNull: true },
      phone: { type: Sequelize.STRING(40), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING(120), allowNull: true },
      headcount: { type: Sequelize.INTEGER, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      passport_id: { type: Sequelize.UUID, allowNull: true },
      label_request_id: { type: Sequelize.UUID, allowNull: true, unique: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    const [schools] = await queryInterface.sequelize.query(`
      SELECT id, structure_name, contact_email, contact_phone, description, city,
             max_visitors, status::text AS status, created_at, updated_at
      FROM label_requests
      WHERE structure_type = 'ecole'
    `);

    if (schools.length) {
      await queryInterface.bulkInsert(
        'participations',
        schools.map((row) => ({
          id: crypto.randomUUID(),
          kind: 'ecole',
          name: row.structure_name,
          email: row.contact_email && String(row.contact_email).trim() ? String(row.contact_email).trim() : null,
          phone: row.contact_phone || null,
          description: row.description || null,
          city: row.city || null,
          headcount: row.max_visitors || null,
          status: row.status,
          passport_id: null,
          label_request_id: row.id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })),
      );
    }

    await queryInterface.sequelize.query(`DELETE FROM label_requests WHERE structure_type = 'ecole'`);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('participations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_participations_kind";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_participations_status";');
  },
};
