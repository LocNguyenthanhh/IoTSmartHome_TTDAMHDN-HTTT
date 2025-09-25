const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/DeviceController");

// Xem danh sách tất cả thiết bị
router.get("/", deviceController.getDevices);

// Thêm thiết bị mới
router.post("/", deviceController.createDevice);

// Sửa thông tin thiết bị (PUT hoặc PATCH đều được)
router.put("/:id", deviceController.updateDevice);
// hoặc router.patch("/:id", deviceController.updateDevice);

// Xóa thiết bị
router.delete("/:id", deviceController.deleteDevice);

module.exports = router;
