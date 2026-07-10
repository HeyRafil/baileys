const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');

router.use(authController.authenticate);

router.get('/', authController.isAdmin, settingsController.getSettings);
router.post('/', authController.isAdmin, settingsController.saveSettings);
router.get('/whatsapp-qr', settingsController.getWhatsAppQR);
router.get('/backup', authController.isAdmin, settingsController.backupDatabase);

module.exports = router;
