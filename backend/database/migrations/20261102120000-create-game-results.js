'use strict';

/* Résultats des jeux « L'industrie, vue par vous ! » (quiz, explorateur de talents). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('game_results', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      game: { type: Sequelize.ENUM('quiz', 'talents'), allowNull: false },
      /* Index des options choisies (0 = A), question par question. */
      answers: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      /* Quiz : bonnes réponses sur 5. */
      score: { type: Sequelize.INTEGER, allowNull: true },
      /* Talents : profil(s) en tête (P1 à P4), deux en cas d'égalité. */
      profiles: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('game_results', ['game']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('game_results');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_game_results_game";');
  },
};
