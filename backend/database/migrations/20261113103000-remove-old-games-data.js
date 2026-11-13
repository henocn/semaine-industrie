'use strict';

/*
 * Jeux retirés du programme (Explorateur de talents, vote du produit coup de cœur) :
 * suppression de leurs données de test, validée par l'organisation. Le quiz et le questionnaire restent intacts.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query("DELETE FROM game_results WHERE game = 'talents'");
    await queryInterface.sequelize.query('DELETE FROM vote_ballots');
    await queryInterface.sequelize.query('DELETE FROM vote_options');
  },

  /* Données de test supprimées : rien à restaurer. */
  async down() {},
};
