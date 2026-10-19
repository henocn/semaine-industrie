'use strict';

/* Ajoute le PDF du label officiel sur Organization. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('organizations', 'label_document_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('organizations', 'label_document_url');
  },
};
