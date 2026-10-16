'use strict';

const { DataTypes } = require('sequelize');

/* Option de vote (produit coup de cœur). */
module.exports = (sequelize) => {
  const VoteOption = sequelize.define(
    'VoteOption',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      label: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    { tableName: 'vote_options' },
  );

  return VoteOption;
};
