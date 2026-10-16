'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/* Crée le compte orga de démo. */
module.exports = {
  async up(queryInterface) {
    const password_hash = await bcrypt.hash('Orga2026!', 10);
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        email: 'orga@semaine-industrie.tg',
        password_hash,
        first_name: 'Équipe',
        last_name: 'Organisation',
        role: 'orga',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'orga@semaine-industrie.tg' });
  },
};
