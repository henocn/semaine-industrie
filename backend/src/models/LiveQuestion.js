'use strict';

const { DataTypes } = require('sequelize');

/* Question envoyée en salle (tables rondes). */
module.exports = (sequelize) => {
  const LiveQuestion = sequelize.define(
    'LiveQuestion',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      session_key: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: 'forum',
      },
      author_name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'done', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    { tableName: 'live_questions' },
  );

  return LiveQuestion;
};
