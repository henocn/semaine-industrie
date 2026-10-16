'use strict';

/* Crée la table visit_bookings. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visit_bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      teacher_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      school_name: { type: Sequelize.STRING(200), allowNull: false },
      teacher_name: { type: Sequelize.STRING(160), allowNull: false },
      teacher_email: { type: Sequelize.STRING(180), allowNull: false },
      teacher_phone: { type: Sequelize.STRING(40), allowNull: true },
      visit_day: { type: Sequelize.STRING(40), allowNull: false },
      visit_start: { type: Sequelize.STRING(10), allowNull: false },
      visit_end: { type: Sequelize.STRING(10), allowNull: false },
      headcount: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('visit_bookings');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_visit_bookings_status";');
  },
};
