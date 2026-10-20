'use strict';

const { DataTypes } = require('sequelize');

/* Rendez-vous d'affaires entre deux participants. */
module.exports = (sequelize) => {
  const BusinessMeeting = sequelize.define(
    'BusinessMeeting',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      participant_a_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      participant_b_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      slot_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      slot_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      table_label: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      attendee_ids: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'done', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      contact_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      follow_up_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'business_meetings',
    },
  );

  return BusinessMeeting;
};
