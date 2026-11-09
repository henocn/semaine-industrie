'use strict';

const { DataTypes } = require('sequelize');

/* Participation école, particulier (visites d'usines) ou particulier aux journées du Palais (QR du jour J). */
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
        type: DataTypes.ENUM('ecole', 'particulier', 'palais', 'media'),
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
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      lng: {
        type: DataTypes.DECIMAL(10, 7),
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
      tracking_code: {
        type: DataTypes.STRING(16),
        allowNull: true,
        unique: true,
      },
      passport_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      /* Journées du Palais choisies (16, 17, 18), pour le type « palais ». */
      palais_days: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      /* Entrées scannées au Palais : { "16": "2026-11-16T08:42:00.000Z" }. */
      palais_checkins: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      /* Accréditation média : { outlet: "Radio Lomé", profile: "journaliste" }, pour le type « media ». */
      media_details: {
        type: DataTypes.JSONB,
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
