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
const Passport = require('./Passport')(sequelize);
const PassportVisit = require('./PassportVisit')(sequelize);
const LiveQuestion = require('./LiveQuestion')(sequelize);
const VoteOption = require('./VoteOption')(sequelize);
const VoteBallot = require('./VoteBallot')(sequelize);
const SurveyResponse = require('./SurveyResponse')(sequelize);
const SurveyQuestion = require('./SurveyQuestion')(sequelize);
const AuditEvent = require('./AuditEvent')(sequelize);
const GlobalResource = require('./GlobalResource')(sequelize);
const Participation = require('./Participation')(sequelize);
const GameResult = require('./GameResult')(sequelize);

LabelRequest.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(LabelRequest, { foreignKey: 'organization_id', as: 'labelRequests' });

RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });

VisitBooking.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(VisitBooking, { foreignKey: 'organization_id', as: 'visitBookings' });
VisitBooking.belongsTo(Organization, { foreignKey: 'school_organization_id', as: 'school' });
Organization.hasMany(VisitBooking, { foreignKey: 'school_organization_id', as: 'schoolVisitBookings' });
VisitBooking.belongsTo(User, { foreignKey: 'teacher_user_id', as: 'teacher' });

BusinessMeeting.belongsTo(BusinessParticipant, { foreignKey: 'participant_a_id', as: 'participantA' });
BusinessMeeting.belongsTo(BusinessParticipant, { foreignKey: 'participant_b_id', as: 'participantB' });

PassportVisit.belongsTo(Passport, { foreignKey: 'passport_id', as: 'passport' });
Passport.hasMany(PassportVisit, { foreignKey: 'passport_id', as: 'visits' });
PassportVisit.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(PassportVisit, { foreignKey: 'organization_id', as: 'passportVisits' });
Passport.belongsTo(Organization, { foreignKey: 'school_organization_id', as: 'school' });
Organization.hasMany(Passport, { foreignKey: 'school_organization_id', as: 'groupPassports' });

SurveyResponse.belongsTo(Passport, { foreignKey: 'passport_id', as: 'passport' });
Passport.hasMany(SurveyResponse, { foreignKey: 'passport_id', as: 'surveys' });

VoteBallot.belongsTo(VoteOption, { foreignKey: 'option_id', as: 'option' });
VoteOption.hasMany(VoteBallot, { foreignKey: 'option_id', as: 'ballots' });
VoteOption.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

AuditEvent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(AuditEvent, { foreignKey: 'user_id', as: 'auditEvents' });

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
  Passport,
  PassportVisit,
  LiveQuestion,
  VoteOption,
  VoteBallot,
  SurveyResponse,
  SurveyQuestion,
  AuditEvent,
  GlobalResource,
  Participation,
  GameResult,
};
