const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const authController = require('../controllers/authController');

router.get('/', authController.authenticate, statsController.getDashboardStats);

module.exports = router;
