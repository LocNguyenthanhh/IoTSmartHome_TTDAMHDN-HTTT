const express = require('express');
const router = express.Router();
const roomController = require('../controllers/RoomController');

// GET tất cả phòng
router.get('/', roomController.getRooms);

// GET 1 phòng theo ID
router.get('/:id', roomController.getRoomById);

// POST tạo mới phòng
router.post('/', roomController.createRoom);

// PUT cập nhật phòng
router.put('/:id', roomController.updateRoom);

// DELETE xóa phòng
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
