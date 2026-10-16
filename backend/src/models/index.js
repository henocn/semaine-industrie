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
const VisitBooking = require('./VisitBooking')(sequelize);
const BusinessParticipant = require('./BusinessParticipant')(sequelize);
const BusinessMeeting = require('./BusinessMeeting')(sequelize);

LabelRequest.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(LabelRequest, { foreignKey: 'organization_id', as: 'labelRequests' });

RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });

VisitBooking.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(VisitBooking, { foreignKey: 'organization_id', as: 'visitBookings' });
VisitBooking.belongsTo(User, { foreignKey: 'teacher_user_id', as: 'teacher' });

BusinessMeeting.belongsTo(BusinessParticipant, { foreignKey: 'participant_a_id', as: 'participantA' });
BusinessMeeting.belongsTo(BusinessParticipant, { foreignKey: 'participant_b_id', as: 'participantB' });
BusinessParticipant.hasMany(BusinessMeeting, { foreignKey: 'participant_a_id', as: 'meetingsAsA' });
BusinessParticipant.hasMany(BusinessMeeting, { foreignKey: 'participant_b_id', as: 'meetingsAsB' });

module.exports = {
  sequelize,
  Sequelize,
  Organization,
  LabelRequest,
  User,
  RefreshToken,
  VisitBooking,
  BusinessParticipant,
  BusinessMeeting,
};
