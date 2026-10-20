'use strict';

const { Router } = require('express');
const controller = require('./contact.controller');
const validate = require('../../middlewares/validate.middleware');
const { contactSchema } = require('./contact.validation');

const router = Router();

router.post('/', validate(contactSchema), controller.submit);

module.exports = router;
