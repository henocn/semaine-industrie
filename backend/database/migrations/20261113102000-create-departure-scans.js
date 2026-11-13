'use strict';

/*
 * Scan d'un particulier à un point de départ des visites : qui, où, quand, par quel compte.
 * Un seul scan par inscription : un second scan renvoie le premier.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('departure_scans', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      participation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'participations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      departure_point_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'departure_points', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      /* Nom du point au moment du scan : reste lisible si le point est retiré ensuite. */
      point_name: { type: Sequelize.STRING(200), allowNull: false },
      scanned_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      scanned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('departure_scans', ['departure_point_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('departure_scans');
  },
};
