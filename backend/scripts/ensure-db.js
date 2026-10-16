'use strict';

/* Crée la base semaine_industrie si elle n'existe pas. */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const dbName = process.env.DB_NAME || 'semaine_industrie';
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });

  await client.connect();
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database created: ${dbName}`);
  } else {
    console.log(`Database exists: ${dbName}`);
  }
  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
