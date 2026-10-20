'use strict';

/* Ajoute last_seen_at pour la présence (hors ligne relative). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'last_seen_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.sequelize.query(`
      UPDATE users SET last_seen_at = last_login_at WHERE last_login_at IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'last_seen_at');
  },
};
