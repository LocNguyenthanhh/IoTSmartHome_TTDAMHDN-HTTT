const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/DeviceController");
const Device = require("../models/Device");
const Dialog = require("../models/Dialog");
const adafruitService = require('../services/adafruitServices.js');

// Biến toàn cục để track manual toggle
let manualToggleInProgress = new Set();

// Toggle device state - FIXED MQTT CONFLICT
router.post('/toggle', async (req, res) => {
  try {
    const { deviceId, state } = req.body;
    
    console.log(`⚡ [NODE] MANUAL Toggle: ${deviceId} -> ${state}`);

    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Device ID is required' 
      });
    }

    // Đánh dấu device đang được manual toggle (trong 3 giây)
    manualToggleInProgress.add(deviceId);
    setTimeout(() => {
      manualToggleInProgress.delete(deviceId);
    }, 3000);

    // TRẢ VỀ RESPONSE NGAY LẬP TỨC
    res.json({ 
      success: true, 
      message: `Device ${state ? 'activated' : 'deactivated'}`,
      instant: true
    });

    // XỬ LÝ BACKGROUND
    process.nextTick(async () => {
      try {
        // 1. Cập nhật database với manual flag
        await Device.findByIdAndUpdate(
          deviceId,
          { 
            Device_status: state ? 'On' : 'Off',
            lastUpdated: new Date(),
            lastAction: 'manual' // Đánh dấu là manual action
          },
          { new: true, runValidators: false }
        );

        console.log(`✅ [NODE] Database updated: ${deviceId} -> ${state}`);

        // 2. Gửi lên Adafruit - CHỈ KHI MANUAL TOGGLE
        try {
          await adafruitService.sendFeedData("bbc-led", state ? "1" : "0");
          console.log(`✅ [ADAFRUIT] Feed updated: ${deviceId} -> ${state}`);
        } catch (adafruitError) {
          console.error('❌ [ADAFRUIT] Feed error:', adafruitError.message);
        }

        // 3. Tạo dialog log
        const device = await Device.findById(deviceId).lean();
        if (device) {
          await Dialog.create({
            DeviceID: deviceId,
            Time: new Date(new Date().getTime() + 7 * 60 * 60 * 1000),
            Status_history: state ? 'On' : 'Off',
            Action: `User turned ${state ? 'ON' : 'OFF'} the ${device.Type || 'device'}`,
          });
        }

        console.log(`✅ [NODE] Background processing completed for: ${deviceId}`);

      } catch (backgroundError) {
        console.error('❌ [NODE] Background processing error:', backgroundError.message);
      }
    });

  } catch (err) {
    console.error('❌ [NODE] Toggle error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error'
    });
  }
});

// API để kiểm tra manual toggle status
router.get('/manual-status/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const isManual = manualToggleInProgress.has(deviceId);
  res.json({ isManual });
});

// Xem danh sách tất cả thiết bị
router.get("/", deviceController.getDevices);

// Thêm thiết bị mới
router.post("/", deviceController.createDevice);

// Sửa thông tin thiết bị
router.put("/:id", deviceController.updateDevice);

// Xóa thiết bị
router.delete("/:id", deviceController.deleteDevice);

module.exports = router;