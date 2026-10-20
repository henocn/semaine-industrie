'use strict';

const { Router } = require('express');
const controller = require('./survey.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const {
  submitSchema,
  createQuestionSchema,
  updateQuestionSchema,
  moveQuestionSchema,
} = require('./survey.validation');

const router = Router();

router.get('/questions', controller.questions);
router.post('/', validate(submitSchema), controller.submit);

router.get('/admin/questions', authenticate, authorize('orga'), controller.listAdmin);
router.post(
  '/admin/questions',
  authenticate,
  authorize('orga'),
  validate(createQuestionSchema),
  controller.createQuestion,
);
router.patch(
  '/admin/questions/:id',
  authenticate,
  authorize('orga'),
  validate(updateQuestionSchema),
  controller.updateQuestion,
);
router.post(
  '/admin/questions/:id/move',
  authenticate,
  authorize('orga'),
  validate(moveQuestionSchema),
  controller.moveQuestion,
);
router.delete('/admin/questions/:id', authenticate, authorize('orga'), controller.deleteQuestion);
router.get('/stats', authenticate, authorize('orga'), controller.stats);
router.get('/responses', authenticate, authorize('orga'), controller.recent);

module.exports = router;
