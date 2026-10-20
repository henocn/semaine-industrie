'use strict';

const { DataTypes } = require('sequelize');

/* Événement d'audit (qui a modifié / supprimé quoi). */
module.exports = (sequelize) => {
  const AuditEvent = sequelize.define(
    'AuditEvent',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: true },
      actor_email: { type: DataTypes.STRING(180), allowNull: true },
      actor_name: { type: DataTypes.STRING(200), allowNull: true },
      action: { type: DataTypes.STRING(40), allowNull: false },
      entity_type: { type: DataTypes.STRING(60), allowNull: false },
      entity_id: { type: DataTypes.STRING(80), allowNull: true },
      summary: { type: DataTypes.STRING(500), allowNull: false },
      meta: { type: DataTypes.JSONB, allowNull: true },
    },
    { tableName: 'audit_events' },
  );

  return AuditEvent;
};
