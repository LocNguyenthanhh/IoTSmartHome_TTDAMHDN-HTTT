const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/DeviceController");
const Device = require("../models/Device");
const Dialog = require("../models/Dialog");
const adafruitService = require('../services/adafruitServices.js'); // chứa MQTT + HTTP

router.post('/toggle', async (req, res) => {
  try {
    const { id, state } = req.body;   // state: true/false
    const device = await Device.findById(id);
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    // Gửi lên Adafruit feed luôn
    await adafruitService.sendFeedData("bbc-led", state ? "1" : "0");

    // Gửi POST tới Flask để emit realtime
    await adafruitService.updateFlaskRealtime(id, state);

    res.json({ success: true, device });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

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
