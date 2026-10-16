'use strict';

/* Routes d'authentification. */
const { Router } = require('express');
const controller = require('./auth.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { loginSchema, refreshSchema } = require('./auth.validation');

const router = Router();

router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(refreshSchema), controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
