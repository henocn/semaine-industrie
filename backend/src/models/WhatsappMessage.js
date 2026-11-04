'use strict';

const { DataTypes } = require('sequelize');

/* Message échangé avec le bot WhatsApp. */
module.exports = (sequelize) => {
  const WhatsappMessage = sequelize.define(
    'WhatsappMessage',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      direction: { type: DataTypes.STRING(3), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      wa_message_id: { type: DataTypes.STRING(200), allowNull: true, unique: true },
      sent_at: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'whatsapp_messages' },
  );

  return WhatsappMessage;
};
