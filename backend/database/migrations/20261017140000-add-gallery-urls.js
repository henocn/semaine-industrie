'use strict';

/* Galerie de 3 images pour les entreprises (demande + fiche). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('label_requests', 'gallery_urls', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('organizations', 'gallery_urls', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('label_requests', 'gallery_urls');
    await queryInterface.removeColumn('organizations', 'gallery_urls');
  },
};
