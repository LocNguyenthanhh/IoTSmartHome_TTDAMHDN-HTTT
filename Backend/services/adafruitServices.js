// Backend/services/adafruitService.js
const axios = require('axios');
const mqtt = require('mqtt');

const ADAFRUIT_IO_USERNAME = process.env.ADAFRUIT_IO_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_IO_KEY;

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
  client.subscribe(`${ADAFRUIT_IO_USERNAME}/feeds/device-status`, (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
    } else {
      console.log('Subscribed to feed: device-status');
    }
  });
});

client.on('message', async (topic, message) => {
  try {
    const data = message.toString();
    console.log(`Feed update on ${topic}: ${data}`);
    const Dialog = require('../models/Dialog');
    await Dialog.create({
      Time: new Date(),
      Status_history: data,
      Action: 'MQTT update',
    });
    console.log('Data saved to MongoDB');
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

client.on('error', (error) => {
  console.error('MQTT connection error:', error);
});

client.on('close', () => {
  console.log('MQTT connection closed');
});

exports.closeMqttConnection = () => {
  client.end();
};