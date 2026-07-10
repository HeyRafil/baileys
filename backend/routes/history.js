const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const authController = require('../controllers/authController');

router.use(authController.authenticate);

router.get('/', historyController.getHistory);
router.post('/ask', historyController.askQuestionWeb);
router.get('/student/:student_id', historyController.getStudentHistory);

module.exports = router;
