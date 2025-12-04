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
    });
    return res.data;
  } catch (error) {
    throw new Error(`Failed to fetch feed data: ${error.message}`);
  }
};

exports.sendFeedData = async (feedKey, value) => {
  try {
    const url = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data`;
    const res = await axios.post(url, { value }, {
      headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY },
    });
    return res.data;
  } catch (error) {
    throw new Error(`Failed to send feed data: ${error.message}`);
  }
};

// MQTT client
const client = mqtt.connect('mqtts://io.adafruit.com', {
  username: ADAFRUIT_IO_USERNAME,
  password: ADAFRUIT_IO_KEY,
  reconnectPeriod: 1000, // Tự động reconnect sau 1 giây nếu mất kết nối
});

client.on('connect', () => {
  console.log('Connected to Adafruit IO via MQTT');
  client.subscribe(`${ADAFRUIT_IO_USERNAME}/feeds/BBC_LED`, (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
    } else {
      console.log('Subscribed to feed: BBC_LED');
    }
  });
});

client.on('message', async (topic, message) => {
  try {
    const data = message.toString();
    console.log(`Feed update on ${topic}: ${data}`);
    const Dialog = require('../models/Dialog');
    const Device = require('../models/Device');
    const deviceId = '69313a7d27fa074d0ad13d66';
    const newStatus = data === "1" ? "ON" : "OFF";
    const device = await Device.findById(deviceId);
    if (!device) {
      console.error("Device not found");
      return;
    }
    device.Device_status = newStatus;
    await device.save();
    console.log(`Device ${device.Type} status updated to ${newStatus}`);
    await Dialog.create({
      DeviceID : deviceId,  
      Time: new Date(new Date().getTime() + 7 * 60 * 60 * 1000),
      Status_history: newStatus,
      Action: `User turn ${newStatus} the ${device.Type}`,
    });
    

    // Gửi POST đến Flask để emit SocketIO -> frontend realtime
    await axios.post('http://127.0.0.1:5000/device_update', {
      id: deviceId,
      state: newStatus === "ON"
    });
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});


// Gửi POST tới Flask để cập nhật realtime FE
exports.updateFlaskRealtime = async (id, state) => {
  try {
    await axios.post('http://127.0.0.1:5000/device_update', {
      id,
      state
    });
  } catch (err) {
    console.error(err);
  }
};

client.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

client.on('close', () => {
  console.log('MQTT connection closed');
});

exports.closeMqttConnection = () => {
  client.end();
};