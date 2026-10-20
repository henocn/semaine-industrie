'use strict';

/* Table d'audit métier + rôles admin/simple (utilisateur existant → admin en base). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'admin';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'simple';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    /* L'utilisateur actuel (orga) devient admin, sans e-mail en dur dans le code. */
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'admin' WHERE role = 'orga';
    `);

    await queryInterface.createTable('audit_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      actor_email: { type: Sequelize.STRING(180), allowNull: true },
      actor_name: { type: Sequelize.STRING(200), allowNull: true },
      action: { type: Sequelize.STRING(40), allowNull: false },
      entity_type: { type: Sequelize.STRING(60), allowNull: false },
      entity_id: { type: Sequelize.STRING(80), allowNull: true },
      summary: { type: Sequelize.STRING(500), allowNull: false },
      meta: { type: Sequelize.JSONB, allowNull: true },
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

    await queryInterface.addIndex('audit_events', ['created_at']);
    await queryInterface.addIndex('audit_events', ['entity_type', 'entity_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_events');
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'orga' WHERE role IN ('admin', 'simple');
    `);
  },
};
