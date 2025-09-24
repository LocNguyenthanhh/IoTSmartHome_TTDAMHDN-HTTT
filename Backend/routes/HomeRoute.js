const express = require('express');
const router = express.Router();
const homeController = require('../controllers/HomeController');

// GET tất cả Home
router.get('/', homeController.getHomes);

// GET 1 Home theo ID
router.get('/:id', homeController.getHomeById);

// POST tạo mới Home
router.post('/', homeController.createHome);

// PUT cập nhật Home
router.put('/:id', homeController.updateHome);

// DELETE xóa Home
router.delete('/:id', homeController.deleteHome);

module.exports = router;
