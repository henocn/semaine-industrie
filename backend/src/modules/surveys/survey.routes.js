'use strict';

const { Router } = require('express');
const controller = require('./survey.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { submitSchema } = require('./survey.validation');

const router = Router();

router.get('/questions', controller.questions);
router.post('/', validate(submitSchema), controller.submit);
router.get('/stats', authenticate, authorize('orga'), controller.stats);

module.exports = router;
