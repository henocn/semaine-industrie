'use strict';

/* Crée ou met à jour le compte admin principal depuis le .env. */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { User, sequelize } = require('../src/models');

async function ensureSuperadmin() {
  const email = (process.env.SUPERADMIN_EMAIL || 'orga@semaineindustrie.tg').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const firstName = process.env.SUPERADMIN_FIRST_NAME || 'Équipe';
  const lastName = process.env.SUPERADMIN_LAST_NAME || 'Organisation';

  if (!password || password.includes('CHANGE_ME')) {
    throw new Error('SUPERADMIN_PASSWORD doit être défini (et pas le placeholder) dans backend/.env');
  }

  await sequelize.authenticate();

  const password_hash = await bcrypt.hash(password, 10);
  const existing = await User.scope('withSecret').findOne({ where: { email } });

  if (existing) {
    await existing.update({
      password_hash,
      first_name: firstName,
      last_name: lastName,
      role: 'admin',
      is_active: true,
    });
    console.log(`Admin mis à jour : ${email}`);
  } else {
    await User.create({
      email,
      password_hash,
      first_name: firstName,
      last_name: lastName,
      role: 'admin',
      is_active: true,
    });
    console.log(`Admin créé : ${email}`);
  }
}

ensureSuperadmin()
  .then(() => sequelize.close())
  .catch(async (err) => {
    console.error(err.message || err);
    try { await sequelize.close(); } catch { /* ignore */ }
    process.exit(1);
  });
