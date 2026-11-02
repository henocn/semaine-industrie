'use strict';

const { DataTypes } = require('sequelize');

/* Partie terminée d'un jeu « L'industrie, vue par vous ! ». */
module.exports = (sequelize) => {
  const GameResult = sequelize.define(
    'GameResult',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      game: {
        type: DataTypes.ENUM('quiz', 'talents'),
        allowNull: false,
      },
      answers: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      profiles: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    { tableName: 'game_results' },
  );

  return GameResult;
};
