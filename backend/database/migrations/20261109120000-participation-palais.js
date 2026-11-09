'use strict';

/*
 * Inscriptions des particuliers aux journées du Palais des Congrès (16, 17, 18 novembre).
 * Ajout seul : une nouvelle valeur « palais » pour le type, les journées choisies et les entrées scannées.
 * Les index d'unicité existants sont déjà par type : le Palais est une section à part.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    /* Hors transaction : PostgreSQL l'exige pour ajouter une valeur d'enum. */
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_participations_kind\" ADD VALUE IF NOT EXISTS 'palais'",
    );
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('participations', 'palais_days', { type: Sequelize.JSONB, allowNull: true }, { transaction });
      await queryInterface.addColumn('participations', 'palais_checkins', { type: Sequelize.JSONB, allowNull: true }, { transaction });
    });
  },

  /* PostgreSQL ne sait pas retirer une valeur d'enum : seules les deux colonnes sont retirées. */
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('participations', 'palais_checkins', { transaction });
      await queryInterface.removeColumn('participations', 'palais_days', { transaction });
    });
  },
};
