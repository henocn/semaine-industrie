'use strict';

/* Ajoute les profils « entreprise » et « particulier » ; les anciens (pme, investisseur, acheteur) restent valides. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_business_participants_kind\" ADD VALUE IF NOT EXISTS 'entreprise'",
    );
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_business_participants_kind\" ADD VALUE IF NOT EXISTS 'particulier'",
    );
  },

  /* PostgreSQL ne sait pas retirer une valeur d'enum : rien à défaire, les données restent intactes. */
  async down() {},
};
