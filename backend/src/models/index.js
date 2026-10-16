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
const User = require('./User')(sequelize);
const RefreshToken = require('./RefreshToken')(sequelize);

LabelRequest.belongsTo(Organization, {
  foreignKey: 'organization_id',
  as: 'organization',
});
Organization.hasMany(LabelRequest, {
  foreignKey: 'organization_id',
  as: 'labelRequests',
});

RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });

const db = {
  sequelize,
  Sequelize,
  Organization,
  LabelRequest,
  User,
  RefreshToken,
};

module.exports = db;
