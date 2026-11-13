'use strict';

const { DataTypes } = require('sequelize');

/* Point de départ des visites : une école cochée (organization_id) ou un point libre. */
module.exports = (sequelize) => {
  const DeparturePoint = sequelize.define(
    'DeparturePoint',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    { tableName: 'departure_points' },
  );

  return DeparturePoint;
};
