'use strict';

const { DataTypes } = require('sequelize');

/* Définit le modèle VisitBooking (réservation de visite par un enseignant). */
module.exports = (sequelize) => {
  const VisitBooking = sequelize.define(
    'VisitBooking',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      teacher_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      school_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      teacher_name: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      teacher_email: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      teacher_phone: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      visit_day: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      visit_start: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      visit_end: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      headcount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'visit_bookings',
    },
  );

  return VisitBooking;
};
