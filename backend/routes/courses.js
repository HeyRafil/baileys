const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const authController = require('../controllers/authController');

// All endpoints here require authentication
router.use(authController.authenticate);

router.get('/', coursesController.getCourses);
router.post('/', authController.isAdmin, coursesController.createCourse);
router.put('/:id', authController.isAdmin, coursesController.updateCourse);
router.delete('/:id', authController.isAdmin, coursesController.deleteCourse);

module.exports = router;
