'use strict';

/* Crée les tables P2 : passeport, live, vote, questionnaire. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('passports', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      code: { type: Sequelize.STRING(24), allowNull: false, unique: true },
      holder_name: { type: Sequelize.STRING(160), allowNull: true },
      school_name: { type: Sequelize.STRING(200), allowNull: true },
      class_label: { type: Sequelize.STRING(80), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('passport_visits', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      passport_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'passports', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      organization_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'organizations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      scanned_by: { type: Sequelize.STRING(160), allowNull: true },
      scanned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('passport_visits', ['passport_id', 'organization_id'], {
      unique: true,
      name: 'passport_visits_unique_org',
    });

    await queryInterface.createTable('live_questions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      session_key: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'forum' },
      author_name: { type: Sequelize.STRING(120), allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'done', 'rejected'),
        allowNull: false, defaultValue: 'pending',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('vote_options', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      label: { type: Sequelize.STRING(200), allowNull: false },
      organization_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'organizations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('vote_ballots', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      option_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'vote_options', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      voter_key: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('survey_responses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      passport_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'passports', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      phase: { type: Sequelize.ENUM('before', 'after'), allowNull: false },
      answers: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      source: { type: Sequelize.ENUM('qr', 'paper'), allowNull: false, defaultValue: 'qr' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('survey_responses');
    await queryInterface.dropTable('vote_ballots');
    await queryInterface.dropTable('vote_options');
    await queryInterface.dropTable('live_questions');
    await queryInterface.dropTable('passport_visits');
    await queryInterface.dropTable('passports');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_survey_responses_phase";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_survey_responses_source";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_live_questions_status";');
  },
};
