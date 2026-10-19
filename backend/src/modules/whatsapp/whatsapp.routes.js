'use strict';

/* Routes webhook WhatsApp Cloud API (vérification + messages). */
const { Router } = require('express');
const controller = require('./whatsapp.controller');

const router = Router();

router.get('/webhook', controller.verify);
router.post('/webhook', controller.webhook);
router.post('/send', controller.send);

module.exports = router;
