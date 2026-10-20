'use strict';

/* Routes webhook WhatsApp Cloud API (vérification + messages). */
const { Router } = require('express');
const controller = require('./whatsapp.controller');

const router = Router();

router.get('/webhook', controller.verify);
router.post('/webhook', controller.webhook);
router.post('/inbound', controller.inbound);
router.post('/send', controller.send);
router.post('/remind-label', controller.remindLabel);
router.post('/remind-visit', controller.remindVisit);

module.exports = router;
