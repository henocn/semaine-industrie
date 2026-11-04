'use strict';

/* Routes webhook WhatsApp Cloud API (vérification + messages). */
const { Router } = require('express');
const controller = require('./whatsapp.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

const router = Router();

router.get('/webhook', controller.verify);
router.post('/webhook', controller.webhook);
router.post('/inbound', controller.inbound);
router.post('/send', controller.send);
router.post('/remind-label', controller.remindLabel);
router.post('/remind-visit', controller.remindVisit);

/* Conversations du bot : lecture seule, réservée aux admins. */
router.get('/conversations', authenticate, authorize('admin'), controller.listConversations);
router.get('/conversations/:phone', authenticate, authorize('admin'), controller.getConversation);

module.exports = router;
