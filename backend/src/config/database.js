'use strict';

/* Config Sequelize (CLI + runtime) lue depuis env. */
require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'semaine_industrie',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
};

module.exports = {
  development: { ...base },
  test: { ...base, database: `${base.database}_test` },
  production: { ...base, logging: false },
};
