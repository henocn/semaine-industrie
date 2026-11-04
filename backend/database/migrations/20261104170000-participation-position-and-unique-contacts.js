'use strict';

/* Mêmes clés que src/utils/uniqueContact.js : un e-mail sans casse, un numéro en chiffres,
   un nom sans casse, sans accents et sans espaces en trop. */
const emailKey = (x) => `lower(trim(${x}))`;
const digits = (x) => `regexp_replace(${x}, '\\D', '', 'g')`;
const phoneKey = (x) => `(CASE WHEN ${digits(x)} ~ '^[0-9]{8}$' THEN '228' || ${digits(x)} ELSE ${digits(x)} END)`;
const nameKey = (x) => `regexp_replace(trim(translate(lower(${x}), 'àâäáãéèêëíìîïóòôöõúùûüçñ’', 'aaaaaeeeeiiiiooooouuuucn''')), '\\s+', ' ', 'g')`;

const BUSINESS_NAME = "COALESCE(NULLIF(trim(organization_name), ''), contact_name)";

/* Une ligne par règle d'unicité. Une école et un particulier sont deux sections distinctes. */
const RULES = [
  { index: 'participations_unique_email', table: 'participations', scope: 'kind', key: emailKey('email'), filled: "email IS NOT NULL AND trim(email) <> ''" },
  { index: 'participations_unique_phone', table: 'participations', scope: 'kind', key: phoneKey('phone'), filled: "phone IS NOT NULL AND trim(phone) <> ''" },
  { index: 'participations_unique_name', table: 'participations', scope: 'kind', key: nameKey('name'), filled: "trim(name) <> ''" },
  { index: 'business_participants_unique_email', table: 'business_participants', key: emailKey('email'), filled: "trim(email) <> ''" },
  { index: 'business_participants_unique_phone', table: 'business_participants', key: phoneKey('phone'), filled: "phone IS NOT NULL AND trim(phone) <> ''" },
  { index: 'business_participants_unique_name', table: 'business_participants', key: nameKey(BUSINESS_NAME), filled: `${BUSINESS_NAME} IS NOT NULL` },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('participations', 'address', { type: Sequelize.TEXT, allowNull: true }, { transaction });
      await queryInterface.addColumn('participations', 'lat', { type: Sequelize.DECIMAL(10, 7), allowNull: true }, { transaction });
      await queryInterface.addColumn('participations', 'lng', { type: Sequelize.DECIMAL(10, 7), allowNull: true }, { transaction });

      for (const rule of RULES) {
        const columns = rule.scope ? `${rule.scope}, (${rule.key})` : `(${rule.key})`;
        /* Aucune donnée n'est supprimée : avec des doublons déjà en base, le service reste le seul garde-fou. */
        const duplicates = await queryInterface.sequelize.query(
          `SELECT 1 FROM ${rule.table} WHERE ${rule.filled} GROUP BY ${columns} HAVING COUNT(*) > 1 LIMIT 1`,
          { transaction, type: Sequelize.QueryTypes.SELECT },
        );
        if (duplicates.length) {
          console.warn(`[migration] doublons existants : index ${rule.index} non créé`);
          continue;
        }
        await queryInterface.sequelize.query(
          `CREATE UNIQUE INDEX ${rule.index} ON ${rule.table} (${columns}) WHERE ${rule.filled}`,
          { transaction },
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const rule of RULES) {
        await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${rule.index}`, { transaction });
      }
      await queryInterface.removeColumn('participations', 'lng', { transaction });
      await queryInterface.removeColumn('participations', 'lat', { transaction });
      await queryInterface.removeColumn('participations', 'address', { transaction });
    });
  },
};
