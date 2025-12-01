// Backend/services/adafruitService.js
const axios = require('axios');
const mqtt = require('mqtt');
const dotenv = require('dotenv');

dotenv.config();
const ADAFRUIT_IO_USERNAME = process.env.ADAFRUIT_AIO_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_AIO_KEY;

// HTTP functions
exports.getFeedData = async (feedKey) => {
  try {
    const url = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data`;
    const res = await axios.get(url, {
      headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY },
      timeout: 2000
    });
    return res.data;
  } catch (error) {
    console.error(`❌ [ADAFRUIT] Failed to fetch feed data: ${error.message}`);
    throw error;
  }
};

exports.sendFeedData = async (feedKey, value) => {
  try {
    const url = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data`;
    const res = await axios.post(url, { value }, {
      headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY },
      timeout: 1500
    });
    console.log(`✅ [ADAFRUIT] Sent data to feed ${feedKey}: ${value}`);
    return res.data;
  } catch (error) {
    console.error(`❌ [ADAFRUIT] Failed to send feed data: ${error.message}`);
    throw error;
  }
};

// MQTT client
const client = mqtt.connect('mqtts://io.adafruit.com', {
  username: ADAFRUIT_IO_USERNAME,
  password: ADAFRUIT_IO_KEY,
  reconnectPeriod: 1000,
  connectTimeout: 3000,
  keepalive: 30
});

client.on('connect', () => {
  console.log('✅ Connected to Adafruit IO via MQTT');
  client.subscribe(`${ADAFRUIT_IO_USERNAME}/feeds/bbc-led`, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe:', err);
    } else {
      console.log('✅ Subscribed to feed: bbc-led');
    }
  });
});

client.on('message', async (topic, message) => {
  // Xử lý MQTT message trong background
  process.nextTick(async () => {
    try {
      const data = message.toString();
      console.log(`📡 [MQTT] Feed update received: ${data}`);
      
      const Dialog = require('../models/Dialog');
      const Device = require('../models/Device');
      
      const deviceId = '68d6fa31e49fe3e1ff224306';
      const newStatus = data === "1" ? "On" : "Off";
      
      // KIỂM TRA XEM CÓ ĐANG MANUAL TOGGLE KHÔNG
      try {
        const manualCheck = await axios.get(`http://localhost:3000/api/devices/manual-status/${deviceId}`, {
          timeout: 1000
        });
        
        if (manualCheck.data.isManual) {
          console.log(`⚠️ [MQTT] Ignoring MQTT update - manual toggle in progress for: ${deviceId}`);
          return; // KHÔNG xử lý MQTT nếu đang có manual toggle
        }
      } catch (checkError) {
        console.log(`⚠️ [MQTT] Manual check failed: ${checkError.message}`);
      }
      
      console.log(`✅ [MQTT] Processing MQTT update: ${deviceId} -> ${newStatus}`);

      // Cập nhật device status từ MQTT
      const device = await Device.findByIdAndUpdate(
        deviceId,
        { 
          Device_status: newStatus,
          lastUpdated: new Date(),
          lastAction: 'mqtt' // Đánh dấu là MQTT action
        },
        { new: true, runValidators: false }
      );

      if (!device) {
        console.error("❌ Device not found");
        return;
      }

      console.log(`✅ [MQTT] Device ${device.Type} status updated to ${newStatus}`);

      // Tạo dialog cho MQTT action
      await Dialog.create({
        DeviceID: deviceId,  
        Time: new Date(new Date().getTime() + 7 * 60 * 60 * 1000),
        Status_history: newStatus,
        Action: `System turned ${newStatus} the device via MQTT`,
      });

      // Gửi đến Flask để update UI
      await axios.post('http://localhost:5000/device_update', {
        id: deviceId,
        state: newStatus === "On"
      }, {
        timeout: 1000
      });

      console.log(`✅ [MQTT] MQTT processing completed for: ${deviceId}`);

    } catch (error) {
      console.error('❌ MQTT processing error:', error.message);
    }
  });
});

// Gửi POST tới Flask để cập nhật realtime FE
exports.updateFlaskRealtime = async (id, state) => {
  try {
    await axios.post('http://localhost:5000/device_update', {
      id,
      state
    }, {
      timeout: 1000
    });
  } catch (err) {
    console.error(`❌ [FLASK] Realtime update failed: ${err.message}`);
  }
};

client.on('error', (error) => {
  console.error('❌ MQTT connection error:', error.message);
});

client.on('close', () => {
  console.log('⚠️ MQTT connection closed');
});

exports.closeMqttConnection = () => {
  client.end();
};

exports.mqttClient = client;