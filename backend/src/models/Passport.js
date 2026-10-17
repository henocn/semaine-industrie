'use strict';

const { DataTypes } = require('sequelize');

/* Passeport industrie (individuel ou groupe / classe). */
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
      kind: {
        type: DataTypes.ENUM('individual', 'group'),
        allowNull: false,
        defaultValue: 'individual',
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
      headcount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      school_organization_id: {
        type: DataTypes.UUID,
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
