'use strict';

/* Rend organisation et contact B2B optionnels (formulaires publics sans ces champs). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('business_participants', 'organization_name', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.changeColumn('business_participants', 'contact_name', {
      type: Sequelize.STRING(160),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE business_participants
      SET organization_name = COALESCE(NULLIF(TRIM(organization_name), ''), email, 'Inconnu')
      WHERE organization_name IS NULL OR TRIM(organization_name) = ''
    `);
    await queryInterface.sequelize.query(`
      UPDATE business_participants
      SET contact_name = COALESCE(NULLIF(TRIM(contact_name), ''), email, 'Inconnu')
      WHERE contact_name IS NULL OR TRIM(contact_name) = ''
    `);
    await queryInterface.changeColumn('business_participants', 'organization_name', {
      type: Sequelize.STRING(200),
      allowNull: false,
    });
    await queryInterface.changeColumn('business_participants', 'contact_name', {
      type: Sequelize.STRING(160),
      allowNull: false,
    });
  },
};
