'use strict';

const { DataTypes } = require('sequelize');

/* Tampon / scan d'une visite sur un passeport. */
module.exports = (sequelize) => {
  const PassportVisit = sequelize.define(
    'PassportVisit',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      passport_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      scanned_by: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      scanned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    { tableName: 'passport_visits', updatedAt: false },
  );

  return PassportVisit;
};
