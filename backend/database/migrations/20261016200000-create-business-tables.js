'use strict';

/* Crée business_participants et business_meetings. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('business_participants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      kind: {
        type: Sequelize.ENUM('investisseur', 'pme', 'acheteur'),
        allowNull: false,
      },
      organization_name: { type: Sequelize.STRING(200), allowNull: false },
      contact_name: { type: Sequelize.STRING(160), allowNull: false },
      email: { type: Sequelize.STRING(180), allowNull: false },
      phone: { type: Sequelize.STRING(40), allowNull: true },
      sector: { type: Sequelize.STRING(120), allowNull: true },
      offers: { type: Sequelize.TEXT, allowNull: true },
      seeks: { type: Sequelize.TEXT, allowNull: true },
      country: { type: Sequelize.STRING(80), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('business_meetings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      participant_a_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'business_participants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      participant_b_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'business_participants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      slot_start: { type: Sequelize.DATE, allowNull: false },
      slot_end: { type: Sequelize.DATE, allowNull: false },
      table_label: { type: Sequelize.STRING(40), allowNull: true },
      status: {
        type: Sequelize.ENUM('scheduled', 'done', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      contact_note: { type: Sequelize.TEXT, allowNull: true },
      follow_up_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('business_meetings');
    await queryInterface.dropTable('business_participants');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_business_meetings_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_business_participants_kind";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_business_participants_status";');
  },
};
