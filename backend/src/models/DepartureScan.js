'use strict';

const { DataTypes } = require('sequelize');

/* Scan d'un particulier à un point de départ (un seul par inscription). */
module.exports = (sequelize) => {
  const DepartureScan = sequelize.define(
    'DepartureScan',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      participation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      departure_point_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      point_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      scanned_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      scanned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    { tableName: 'departure_scans', timestamps: false },
  );

  return DepartureScan;
};
