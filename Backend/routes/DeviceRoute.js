const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/DeviceController");
const Device = require("../models/Device");
const Dialog = require("../models/Dialog");
const adafruitService = require('../services/adafruitServices.js'); // chứa MQTT + HTTP

// Backend/routes/DeviceRoute.js

// Backend/routes/DeviceRoute.js

router.post('/toggle', async (req, res) => {
    try {
        const { id, state } = req.body;   // state: true/false
        const device = await Device.findById(id);
        
        if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

        const value = state ? "1" : "0";
        
        // -----------------------------------------------------
        // 1. SỬA LỖI TRIỆT ĐỂ: Dùng publishMessage cho cả BẬT và TẮT
        //    (publishMessage kích hoạt Guard và gửi lệnh qua MQTT)
        // -----------------------------------------------------
        await adafruitService.publishMessage(device.AIO_FeedID, value); 
        
        // -----------------------------------------------------
        // 2. LOGIC ĐỒNG BỘ MONGODB (Giữ nguyên)
        // -----------------------------------------------------
        device.Device_status = state ? 'ON' : 'OFF';
        device.Status = state; // Giả sử Status là boolean
        await device.save();
        
        console.log(`[DB Sync] Cập nhật trạng thái ${device.Device_name} thành ${device.Device_status}`);

        // 3. Gửi POST tới Flask để emit realtime
        await adafruitService.updateFlaskRealtime(id, state);

        res.json({ success: true, device });
    } catch (err) {
        console.error('Lỗi khi xử lý toggle thiết bị:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Xem danh sách tất cả thiết bị
router.get("/", deviceController.getDevices);

// Lấy 1 thiết bị theo ID
router.get("/:id", async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }
    res.json(device);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Thêm thiết bị mới
router.post("/", deviceController.createDevice);

// Sửa thông tin thiết bị (PUT hoặc PATCH đều được)
router.put("/:id", deviceController.updateDevice);
// hoặc router.patch("/:id", deviceController.updateDevice);

// Xóa thiết bị
router.delete("/:id", deviceController.deleteDevice);

module.exports = router;
