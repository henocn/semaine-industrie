'use strict';

/* Les particuliers n'ont plus qu'un champ « Ville Quartier » : les villes déjà saisies y sont reprises.
   La colonne city garde sa valeur. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE participations
      SET address = CASE
        WHEN address IS NULL OR trim(address) = '' THEN trim(city)
        WHEN position(lower(trim(city)) IN lower(address)) > 0 THEN address
        ELSE trim(city) || ', ' || address
      END
      WHERE kind = 'particulier' AND city IS NOT NULL AND trim(city) <> ''
    `);
  },

  /* Retire la ville reprise seule ; une adresse complétée reste telle quelle, car rien ne s'y perd. */
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE participations
      SET address = NULL
      WHERE kind = 'particulier' AND address = trim(city)
    `);
  },
};
