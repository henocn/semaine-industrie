'use strict';

const { DataTypes } = require('sequelize');

/* Participation école ou particulier (QR du jour J, pas un label). */
module.exports = (sequelize) => {
  const Participation = sequelize.define(
    'Participation',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      kind: {
        type: DataTypes.ENUM('ecole', 'particulier'),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(180),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      headcount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      passport_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      label_request_id: {
        type: DataTypes.UUID,
        allowNull: true,
        unique: true,
      },
    },
    {
      tableName: 'participations',
    },
  );

  return Participation;
};
