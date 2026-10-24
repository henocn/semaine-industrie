'use strict';

/* Fichiers joints à une fiche acceptée (label, participation, B2B). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('entry_resources', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      entry_kind: {
        type: Sequelize.ENUM('organization', 'participation', 'business'),
        allowNull: false,
      },
      entry_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
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
    await queryInterface.addIndex('entry_resources', ['entry_kind', 'entry_id'], {
      name: 'entry_resources_kind_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('entry_resources');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_entry_resources_entry_kind";');
  },
};
