'use strict';

const { randomUUID } = require('crypto');

/* Table des questions d'enquête (éditables depuis le backoffice). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('survey_questions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      key: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(400), allowNull: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
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

    const defaults = [
      { key: 'interest', label: "L'industrie m'intéresse comme orientation", sort_order: 1 },
      { key: 'knowledge', label: 'Je connais des usines / métiers locaux', sort_order: 2 },
      { key: 'women', label: "Les femmes ont leur place dans l'industrie", sort_order: 3 },
      { key: 'local', label: 'Transformer localement renforce le pays', sort_order: 4 },
      { key: 'visit', label: 'Je souhaite revoir / travailler dans une usine', sort_order: 5 },
    ];

    const now = new Date();
    await queryInterface.bulkInsert(
      'survey_questions',
      defaults.map((q) => ({
        id: randomUUID(),
        key: q.key,
        label: q.label,
        sort_order: q.sort_order,
        is_active: true,
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('survey_questions');
  },
};
