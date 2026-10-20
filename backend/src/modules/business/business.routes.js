'use strict';

/* Routes rencontres d'affaires. */
const { Router } = require('express');
const controller = require('./business.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const {
  registerSchema,
  reviewParticipantSchema,
  createMeetingSchema,
  contactNoteSchema,
  rescheduleMeetingSchema,
} = require('./business.validation');

const router = Router();

router.post('/participants', validate(registerSchema), controller.register);

router.get('/participants', authenticate, authorize('orga'), controller.listParticipants);
router.patch(
  '/participants/:id/review',
  authenticate,
  authorize('orga'),
  validate(reviewParticipantSchema),
  controller.reviewParticipant,
);

router.get('/meetings', authenticate, authorize('orga'), controller.listMeetings);
router.post(
  '/meetings',
  authenticate,
  authorize('orga'),
  validate(createMeetingSchema),
  controller.createMeeting,
);
router.patch(
  '/meetings/:id/contact',
  authenticate,
  authorize('orga'),
  validate(contactNoteSchema),
  controller.saveContactNote,
);
router.patch(
  '/meetings/:id/reschedule',
  authenticate,
  authorize('orga'),
  validate(rescheduleMeetingSchema),
  controller.rescheduleMeeting,
);

module.exports = router;
