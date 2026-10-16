'use strict';

/* Configure Express : sécurité, CORS, routes, erreurs. */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const errorHandler = require('./middlewares/errorHandler.middleware');
const healthRoutes = require('./modules/health/health.routes');
const labelRoutes = require('./modules/labels/label.routes');
const authRoutes = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const businessRoutes = require('./modules/business/business.routes');

const app = express();

app.set('trust proxy', 'loopback');
app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json());

app.use(`${env.API_PREFIX}/health`, healthRoutes);
app.use(`${env.API_PREFIX}/auth`, authRoutes);
app.use(`${env.API_PREFIX}/labels`, labelRoutes);
app.use(`${env.API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${env.API_PREFIX}/bookings`, bookingRoutes);
app.use(`${env.API_PREFIX}/business`, businessRoutes);

app.use(errorHandler);

module.exports = app;
