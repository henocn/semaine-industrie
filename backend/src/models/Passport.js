'use strict';

const { DataTypes } = require('sequelize');

/* Passeport industrie (carnet jeune avec code/QR). */
module.exports = (sequelize) => {
  const Passport = sequelize.define(
    'Passport',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(24),
        allowNull: false,
        unique: true,
      },
      holder_name: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      school_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      class_label: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    { tableName: 'passports' },
  );

  return Passport;
};
