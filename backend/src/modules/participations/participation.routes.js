'use strict';

const { Router } = require('express');
const controller = require('./participation.controller');
const validate = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createSchema, updateSchema } = require('./participation.validation');

const router = Router();

router.use(authenticate, authorize('orga'));

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', validate(createSchema), controller.create);
router.patch('/:id', validate(updateSchema), controller.update);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.delete('/:id', controller.remove);

module.exports = router;
