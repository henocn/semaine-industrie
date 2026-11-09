'use strict';

/*
 * Accréditation des médias et créateurs de contenu (valable toute la semaine).
 * Ajout seul : une nouvelle valeur « media » pour le type, et le détail de la demande (média ou chaîne, profil).
 * Les index d'unicité existants sont déjà par type : les médias forment une section à part.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    /* Hors transaction : PostgreSQL l'exige pour ajouter une valeur d'enum. */
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_participations_kind\" ADD VALUE IF NOT EXISTS 'media'",
    );
    await queryInterface.addColumn('participations', 'media_details', { type: Sequelize.JSONB, allowNull: true });
  },

  /* PostgreSQL ne sait pas retirer une valeur d'enum : seule la colonne est retirée. */
  async down(queryInterface) {
    await queryInterface.removeColumn('participations', 'media_details');
  },
};
