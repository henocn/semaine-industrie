'use strict';

/* Lie la réservation à l'établissement (école) labellisé. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('visit_bookings', 'school_organization_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'organizations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('visit_bookings', 'school_organization_id');
  },
};
