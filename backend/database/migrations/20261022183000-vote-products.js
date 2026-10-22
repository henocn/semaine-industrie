'use strict';

/* Produits du coup de cœur : image, titre, description. Vide les anciennes options (structures). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vote_options', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('vote_options', 'image_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.sequelize.query('DELETE FROM vote_options');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('vote_options', 'image_url');
    await queryInterface.removeColumn('vote_options', 'description');
  },
};
