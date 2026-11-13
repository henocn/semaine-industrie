'use strict';

/*
 * Rôle « scan » : un compte qui ne fait que scanner les QR (points de départ des visites, accueil du Palais).
 * Ajout seul d'une valeur d'enum : les comptes existants ne changent pas.
 */
module.exports = {
  async up(queryInterface) {
    /* Hors transaction : PostgreSQL l'exige pour ajouter une valeur d'enum. */
    await queryInterface.sequelize.query("ALTER TYPE \"enum_users_role\" ADD VALUE IF NOT EXISTS 'scan'");
  },

  /* PostgreSQL ne sait pas retirer une valeur d'enum : rien à défaire. */
  async down() {},
};
