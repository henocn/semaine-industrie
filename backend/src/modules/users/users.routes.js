'use strict';

const { Router } = require('express');
const controller = require('./users.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createUserSchema, updateUserSchema } = require('./users.validation');

const router = Router();

router.use(authenticate, authorize('orga'));
router.get('/', controller.list);
router.post('/', validate(createUserSchema), controller.create);
router.patch('/:id', validate(updateUserSchema), controller.update);

module.exports = router;
