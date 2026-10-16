'use strict';

/* Crée la table label_requests. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('label_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      structure_name: { type: Sequelize.STRING(200), allowNull: false },
      structure_type: { type: Sequelize.ENUM('entreprise', 'ecole'), allowNull: false },
      sector: { type: Sequelize.STRING(120), allowNull: true },
      region: { type: Sequelize.STRING(120), allowNull: true },
      city: { type: Sequelize.STRING(120), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      lat: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      lng: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      contact_name: { type: Sequelize.STRING(160), allowNull: false },
      contact_email: { type: Sequelize.STRING(180), allowNull: false },
      contact_phone: { type: Sequelize.STRING(40), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      products: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      photo_url: { type: Sequelize.STRING(500), allowNull: true },
      max_visitors: { type: Sequelize.INTEGER, allowNull: true },
      visit_slots: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      safety_rules: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      review_note: { type: Sequelize.TEXT, allowNull: true },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('label_requests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_label_requests_structure_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_label_requests_status";');
  },
};
