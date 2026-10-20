'use strict';

const { DataTypes } = require('sequelize');

/* Question d'enquête gérée depuis le backoffice. */
module.exports = (sequelize) => {
  const SurveyQuestion = sequelize.define(
    'SurveyQuestion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      key: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      label: {
        type: DataTypes.STRING(400),
        allowNull: false,
      },
      kind: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'scale',
      },
      options: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    { tableName: 'survey_questions' },
  );

  return SurveyQuestion;
};
