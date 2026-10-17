'use strict';

/* Passeport de groupe (un seul code pour toute une classe / parcours commun). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_passports_kind" AS ENUM ('individual', 'group');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryInterface.addColumn('passports', 'kind', {
      type: Sequelize.ENUM('individual', 'group'),
      allowNull: false,
      defaultValue: 'individual',
    });
    await queryInterface.addColumn('passports', 'headcount', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('passports', 'school_organization_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'organizations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('passports', 'school_organization_id');
    await queryInterface.removeColumn('passports', 'headcount');
    await queryInterface.removeColumn('passports', 'kind');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_passports_kind";');
  },
};
