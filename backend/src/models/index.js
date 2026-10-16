'use strict';

/* Initialise Sequelize et charge les modèles. */
const { Sequelize } = require('sequelize');
const env = require('../config/env');
const dbConfig = require('../config/database')[env.NODE_ENV];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
  },
);

const Organization = require('./Organization')(sequelize);
const LabelRequest = require('./LabelRequest')(sequelize);

/* Relie demandes de label et organisations. */
LabelRequest.belongsTo(Organization, {
  foreignKey: 'organization_id',
  as: 'organization',
});
Organization.hasMany(LabelRequest, {
  foreignKey: 'organization_id',
  as: 'labelRequests',
});

const db = {
  sequelize,
  Sequelize,
  Organization,
  LabelRequest,
};

module.exports = db;
