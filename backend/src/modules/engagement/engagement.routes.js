'use strict';

const { Router } = require('express');
const controller = require('./engagement.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploadProductImage } = require('../../middlewares/upload.middleware');
const ApiError = require('../../utils/ApiError');
const {
  askSchema,
  reviewQuestionSchema,
  voteSchema,
} = require('./engagement.validation');

const router = Router();

/* Enveloppe multer pour renvoyer une erreur API. */
function withUpload(middleware, nextHandler) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return next(ApiError.badRequest(err.message || 'Upload impossible'));
      return nextHandler(req, res, next);
    });
  };
}

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
router.post(
  '/votes/options',
  authenticate,
  authorize('orga'),
  withUpload(uploadProductImage, controller.createOption),
);
router.patch(
  '/votes/options/:id',
  authenticate,
  authorize('orga'),
  withUpload(uploadProductImage, controller.updateOption),
);
router.delete('/votes/options/:id', authenticate, authorize('orga'), controller.removeOption);

module.exports = router;
