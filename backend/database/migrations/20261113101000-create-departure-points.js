'use strict';

/*
 * Points de départ des visites : une école cochée dans les paramètres (organization_id),
 * ou un point libre qui n'est pas une école (nom seul).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('departure_points', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    /* Une école n'est cochée qu'une fois. */
    await queryInterface.addIndex('departure_points', ['organization_id'], {
      name: 'departure_points_unique_organization',
      unique: true,
      where: { organization_id: { [Sequelize.Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('departure_points');
  },
};
