'use strict';

/* Configure Express : sécurité, CORS, routes, erreurs. */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const httpLogger = require('./middlewares/httpLogger.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');
const healthRoutes = require('./modules/health/health.routes');
const labelRoutes = require('./modules/labels/label.routes');
const authRoutes = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const businessRoutes = require('./modules/business/business.routes');
const contactRoutes = require('./modules/contact/contact.routes');
const passportRoutes = require('./modules/passports/passport.routes');
const engagementRoutes = require('./modules/engagement/engagement.routes');
const surveyRoutes = require('./modules/surveys/survey.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const usersRoutes = require('./modules/users/users.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const resourceRoutes = require('./modules/resources/resource.routes');

const app = express();

app.set('trust proxy', 'loopback');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(httpLogger);

app.use(`${env.API_PREFIX}/health`, healthRoutes);
app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/labels`, labelRoutes);
app.use(`${env.API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${env.API_PREFIX}/bookings`, bookingRoutes);
app.use(`${env.API_PREFIX}/business`, businessRoutes);
app.use(`${env.API_PREFIX}/contact`, contactRoutes);
app.use(`${env.API_PREFIX}/passports`, passportRoutes);
app.use(`${env.API_PREFIX}/engagement`, engagementRoutes);
app.use(`${env.API_PREFIX}/surveys`, surveyRoutes);
app.use(`${env.API_PREFIX}/whatsapp`, whatsappRoutes);
app.use(`${env.API_PREFIX}/users`, usersRoutes);
app.use(`${env.API_PREFIX}/audit`, auditRoutes);
app.use(`${env.API_PREFIX}/resources`, resourceRoutes);

/* 404 JSON pour les routes API inconnues. */
app.use((req, res, next) => {
  const ApiError = require('./utils/ApiError');
  next(ApiError.notFound(`Route introuvable : ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

module.exports = app;
