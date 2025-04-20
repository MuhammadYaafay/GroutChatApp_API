const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const auth = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.post('/', auth, upload.single('file'), uploadController.uploadFile);

module.exports = router; 