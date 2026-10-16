'use strict';

const { Router } = require('express');
const controller = require('./engagement.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const {
  askSchema,
  reviewQuestionSchema,
  voteSchema,
  optionSchema,
} = require('./engagement.validation');

const router = Router();

router.post('/questions', validate(askSchema), controller.ask);
router.get('/questions', controller.listQuestions);
router.patch(
  '/questions/:id',
  authenticate,
  authorize('orga'),
  validate(reviewQuestionSchema),
  controller.reviewQuestion,
);

router.get('/votes', controller.voteResults);
router.post('/votes', validate(voteSchema), controller.castVote);
router.post('/votes/options', authenticate, authorize('orga'), validate(optionSchema), controller.createOption);

module.exports = router;
