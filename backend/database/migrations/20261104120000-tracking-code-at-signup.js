'use strict';

const crypto = require('crypto');

/* Mêmes règles que tracking.service : 4 signes sans 0/O ni 1/I. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BACKFILL_ACTION = 'backfill_tracking_code';

/* Tire un code libre du préfixe et le réserve. */
function freshCode(prefix, taken) {
  for (;;) {
    const suffix = Array.from(crypto.randomBytes(4), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
    const code = `${prefix}-${suffix}`;
    if (!taken.has(code)) {
      taken.add(code);
      return code;
    }
  }
}

/* Le code de suivi existe dès l'inscription : ajoute la colonne et dote les dossiers en attente.
   N'envoie aucun message ; l'envoi aux écoles déjà inscrites passe par scripts/notify-pending-schools.js. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const column = { type: Sequelize.STRING(16), allowNull: true, unique: true };
      await queryInterface.addColumn('participations', 'tracking_code', column, { transaction });
      await queryInterface.addColumn('label_requests', 'tracking_code', column, { transaction });

      const select = (sql) => queryInterface.sequelize.query(sql, {
        transaction,
        type: Sequelize.QueryTypes.SELECT,
      });
      const update = (table, id, code) => queryInterface.sequelize.query(
        `UPDATE ${table} SET tracking_code = :code WHERE id = :id`,
        { transaction, replacements: { id, code } },
      );

      const existing = await select(`
        SELECT label_code AS code FROM organizations WHERE label_code IS NOT NULL
        UNION SELECT legacy_code FROM organizations WHERE legacy_code IS NOT NULL
        UNION SELECT code FROM passports
        UNION SELECT legacy_code FROM passports WHERE legacy_code IS NOT NULL
        UNION SELECT tracking_code FROM business_participants WHERE tracking_code IS NOT NULL
        UNION SELECT legacy_code FROM business_participants WHERE legacy_code IS NOT NULL
      `);
      const taken = new Set(existing.map((row) => row.code));

      const participations = await select(
        "SELECT id, kind FROM participations WHERE status = 'pending' ORDER BY created_at",
      );
      for (const row of participations) {
        const code = freshCode(row.kind === 'ecole' ? 'EC' : 'PA', taken);
        await update('participations', row.id, code);
        /* Cette trace désigne les dossiers du script d'envoi : une inscription postérieure en est exclue. */
        await queryInterface.sequelize.query(
          `INSERT INTO audit_events (action, entity_type, entity_id, summary, meta)
           VALUES (:action, 'participation', :id, :summary, CAST(:meta AS JSONB))`,
          {
            transaction,
            replacements: {
              action: BACKFILL_ACTION,
              id: row.id,
              summary: `Code de suivi ${code} attribué à une inscription déjà enregistrée`,
              meta: JSON.stringify({ code }),
            },
          },
        );
      }

      const requests = await select(
        "SELECT id, structure_type FROM label_requests WHERE status = 'pending' ORDER BY created_at",
      );
      for (const row of requests) {
        await update('label_requests', row.id, freshCode(row.structure_type === 'ecole' ? 'EC' : 'IN', taken));
      }

      const participants = await select(
        "SELECT id FROM business_participants WHERE status = 'pending' AND tracking_code IS NULL ORDER BY created_at",
      );
      for (const row of participants) {
        await update('business_participants', row.id, freshCode('AF', taken));
      }
    });
  },

  /* Retire les colonnes ; les codes déjà remis aux participants d'affaires restent valables. */
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('label_requests', 'tracking_code', { transaction });
      await queryInterface.removeColumn('participations', 'tracking_code', { transaction });
      await queryInterface.sequelize.query(
        'DELETE FROM audit_events WHERE action = :action',
        { transaction, replacements: { action: BACKFILL_ACTION } },
      );
    });
  },
};
