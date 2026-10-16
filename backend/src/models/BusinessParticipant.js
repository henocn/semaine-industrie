'use strict';

const { DataTypes } = require('sequelize');

/* Profil investisseur / PME pour les rencontres d'affaires. */
module.exports = (sequelize) => {
  const BusinessParticipant = sequelize.define(
    'BusinessParticipant',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      kind: {
        type: DataTypes.ENUM('investisseur', 'pme', 'acheteur'),
        allowNull: false,
      },
      organization_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      contact_name: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      sector: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      offers: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      seeks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      tableName: 'business_participants',
    },
  );

  return BusinessParticipant;
};
