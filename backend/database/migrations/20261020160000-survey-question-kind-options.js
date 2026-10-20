'use strict';

/* Ajoute type de question (échelle / choix) et options JSON. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('survey_questions', 'kind', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'scale',
    });
    await queryInterface.addColumn('survey_questions', 'options', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('survey_questions', 'options');
    await queryInterface.removeColumn('survey_questions', 'kind');
  },
};
