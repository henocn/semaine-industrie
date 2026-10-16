'use strict';

const { DataTypes } = require('sequelize');

/* Un vote (1 par voter_key). */
module.exports = (sequelize) => {
  const VoteBallot = sequelize.define(
    'VoteBallot',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      option_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      voter_key: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
    },
    { tableName: 'vote_ballots', updatedAt: false },
  );

  return VoteBallot;
};
