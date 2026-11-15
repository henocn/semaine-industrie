'use strict';

/*
 * Départs des visites d'usines des particuliers (19 et 20 novembre).
 * Ajout seul : le départ choisi par un particulier validé et l'heure de sa réservation.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('participations', 'visit_slot', { type: Sequelize.STRING(40), allowNull: true });
    await queryInterface.addColumn('participations', 'visit_slot_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('participations', 'visit_slot_at');
    await queryInterface.removeColumn('participations', 'visit_slot');
  },
};
