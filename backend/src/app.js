'use strict';

/* Configure Express : sécurité, CORS, routes, erreurs. */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const errorHandler = require('./middlewares/errorHandler.middleware');
const healthRoutes = require('./modules/health/health.routes');

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

app.use(errorHandler);

module.exports = app;
