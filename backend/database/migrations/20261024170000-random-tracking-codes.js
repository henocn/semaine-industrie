'use strict';

const crypto = require('crypto');

/* Mêmes règles que tracking.service : 4 signes sans 0/O ni 1/I. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTION = 'tracking_code_random';

/* Cibles : table, colonne du code, type d'audit, préfixe d'une ligne. */
const TARGETS = [
  {
    table: 'organizations',
    column: 'label_code',
    entity: 'organization',
    prefix: (row) => (row.type === 'ecole' ? 'EC' : 'IN'),
    select: 'SELECT id, type, label_code AS code FROM organizations WHERE label_code IS NOT NULL ORDER BY created_at, id',
  },
  {
    table: 'passports',
    column: 'code',
    entity: 'passport',
    prefix: (row) => (row.kind === 'group' ? 'EC' : 'PA'),
    select: 'SELECT id, kind, code FROM passports WHERE code IS NOT NULL ORDER BY created_at, id',
  },
  {
    table: 'business_participants',
    column: 'tracking_code',
    entity: 'business_participant',
    prefix: () => 'AF',
    select: 'SELECT id, tracking_code AS code FROM business_participants WHERE tracking_code IS NOT NULL ORDER BY created_at, id',
  },
];

/* Tire un code libre du préfixe (ex. EC-G7H5). */
function randomCode(prefix, used) {
  for (;;) {
    const suffix = Array.from(crypto.randomBytes(4), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
    const code = `${prefix}-${suffix}`;
    if (!used.has(code)) {
      used.add(code);
      return code;
    }
  }
}

module.exports = {
  /* Remplace les codes séquentiels par des codes aléatoires ; l'ancien code est gardé dans audit_events. */
  async up(queryInterface) {
    const db = queryInterface.sequelize;
    await db.transaction(async (transaction) => {
      const [legacy] = await db.query(
        `SELECT legacy_code AS code FROM organizations WHERE legacy_code IS NOT NULL
         UNION SELECT legacy_code FROM passports WHERE legacy_code IS NOT NULL
         UNION SELECT legacy_code FROM business_participants WHERE legacy_code IS NOT NULL`,
        { transaction },
      );
      const used = new Set(legacy.map((row) => row.code));
      /* Les codes actuels sont exclus aussi : un ancien code ne doit jamais être réattribué. */
      const current = [];
      for (const target of TARGETS) {
        const [rows] = await db.query(target.select, { transaction });
        rows.forEach((row) => used.add(row.code));
        current.push({ target, rows });
      }

      for (const { target, rows } of current) {
        for (const row of rows) {
          const code = randomCode(target.prefix(row), used);
          await db.query(`UPDATE ${target.table} SET ${target.column} = :code WHERE id = :id`, {
            replacements: { id: row.id, code },
            transaction,
          });
          await db.query(
            `INSERT INTO audit_events (action, entity_type, entity_id, summary, meta)
             VALUES (:action, :entity, :id, :summary, CAST(:meta AS JSONB))`,
            {
              replacements: {
                action: ACTION,
                entity: target.entity,
                id: row.id,
                summary: `Code de suivi ${row.code} remplacé par ${code}`,
                meta: JSON.stringify({ old_code: row.code, new_code: code }),
              },
              transaction,
            },
          );
        }
      }
    });
  },

  /* Remet les anciens codes à partir de audit_events (seulement si le code n'a pas changé depuis). */
  async down(queryInterface) {
    const db = queryInterface.sequelize;
    await db.transaction(async (transaction) => {
      for (const target of TARGETS) {
        await db.query(
          `UPDATE ${target.table} t
           SET ${target.column} = a.meta->>'old_code'
           FROM audit_events a
           WHERE a.action = :action AND a.entity_type = :entity
             AND a.entity_id = t.id::text AND t.${target.column} = a.meta->>'new_code'`,
          { replacements: { action: ACTION, entity: target.entity }, transaction },
        );
      }
    });
  },
};
