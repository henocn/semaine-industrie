'use strict';

const { DataTypes } = require('sequelize');

/* Réponse questionnaire avant / après visite. */
module.exports = (sequelize) => {
  const SurveyResponse = sequelize.define(
    'SurveyResponse',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      passport_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      phase: {
        type: DataTypes.ENUM('before', 'after'),
        allowNull: false,
      },
      answers: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      source: {
        type: DataTypes.ENUM('qr', 'paper'),
        allowNull: false,
        defaultValue: 'qr',
      },
    },
    { tableName: 'survey_responses' },
  );

  return SurveyResponse;
};
