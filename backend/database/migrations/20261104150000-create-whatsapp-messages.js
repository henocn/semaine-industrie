'use strict';

/* Historique des échanges du bot WhatsApp, consulté en lecture seule dans le backoffice. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('whatsapp_messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      /* Numéro du correspondant, en chiffres seulement. */
      phone: { type: Sequelize.STRING(20), allowNull: false },
      /* in : reçu du correspondant ; out : envoyé par le bot. */
      direction: { type: Sequelize.STRING(3), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      /* Nom du profil WhatsApp, transmis par Meta sur les messages reçus. */
      profile_name: { type: Sequelize.STRING(200), allowNull: true },
      /* Identifiant Meta : un même message renvoyé par le webhook n'est gardé qu'une fois. */
      wa_message_id: { type: Sequelize.STRING(200), allowNull: true, unique: true },
      sent_at: { type: Sequelize.DATE, allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('whatsapp_messages', ['phone', 'sent_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_messages');
  },
};
