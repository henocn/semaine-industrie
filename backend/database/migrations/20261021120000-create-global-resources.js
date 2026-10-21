'use strict';

/* Documents partagés (programme, kit, etc.) visibles par tous. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('global_resources', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      file_url: { type: Sequelize.STRING(500), allowNull: false },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('global_resources');
  },
};
