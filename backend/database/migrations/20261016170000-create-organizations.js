'use strict';

/* Crée la table organizations. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organizations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      slug: { type: Sequelize.STRING(220), allowNull: true, unique: true },
      type: { type: Sequelize.ENUM('entreprise', 'ecole'), allowNull: false },
      sector: { type: Sequelize.STRING(120), allowNull: true },
      region: { type: Sequelize.STRING(120), allowNull: true },
      city: { type: Sequelize.STRING(120), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      lat: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      lng: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      contact_name: { type: Sequelize.STRING(160), allowNull: true },
      contact_email: { type: Sequelize.STRING(180), allowNull: true },
      contact_phone: { type: Sequelize.STRING(40), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      products: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      photo_url: { type: Sequelize.STRING(500), allowNull: true },
      label_code: { type: Sequelize.STRING(40), allowNull: true, unique: true },
      label_status: {
        type: Sequelize.ENUM('draft', 'pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      labeled_at: { type: Sequelize.DATE, allowNull: true },
      max_visitors: { type: Sequelize.INTEGER, allowNull: true },
      visit_slots: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      safety_rules: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('organizations');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_organizations_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_organizations_label_status";');
  },
};
