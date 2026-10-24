'use strict';

/* Marque le passage réel (scan industrie) sans toucher aux données existantes. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('passports', 'passed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('passports', 'passed_at');
  },
};
