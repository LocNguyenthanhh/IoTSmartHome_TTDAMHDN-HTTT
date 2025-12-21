// Backend/services/adafruitServices.js - CODE HOÀN CHỈNH ĐÃ CHUẨN HÓA EXPORT

const axios = require('axios');
const mqtt = require('mqtt');
const dotenv = require('dotenv');

const Dialog = require('../models/Dialog');
const Device = require('../models/Device');
const NotificationService = require('./NotificationService');

dotenv.config();
// Khai báo biến cần thiết ở phạm vi toàn cục (const)
const ADAFRUIT_IO_USERNAME = process.env.ADAFRUIT_AIO_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_AIO_KEY;
const AIO_USERNAME = ADAFRUIT_IO_USERNAME; 

let isLocalUpdate = false; 

// ------------------------------------
// 1. MQTT Client Connection
// ------------------------------------
const client = mqtt.connect('mqtts://io.adafruit.com', {
    username: ADAFRUIT_IO_USERNAME,
    password: ADAFRUIT_IO_KEY,
    reconnectPeriod: 1000, 
});

client.on('connect', () => {
    console.log('Connected to Adafruit IO via MQTT');
    client.subscribe(`${ADAFRUIT_IO_USERNAME}/feeds/+`, (err) => { 
        if (err) {
            console.error('Failed to subscribe:', err);
        } else {
            console.log('Subscribed to ALL feeds (Dynamic)'); 
        }
    });
});

client.on('message', async (topic, message) => {
    try {
        if (isLocalUpdate) {
            console.log(`[MQTT Guard] BỎ QUA tin nhắn tự gửi từ Node.js.`);
            return;
        }
        
        const data = message.toString();
        const feedKey = topic.split('/').pop(); 
        const newStatus = data === "1" ? "ON" : "OFF";
        const newStatusBoolean = data === "1"; 

        const device = await Device.findOne({ AIO_FeedID: feedKey }); 
        checkSensorForAlerts(feedKey, data);
        updateDeviceStateInDB(feedKey, data);
        checkSensorForAlerts(feedKey, data);
        if (!device) {
            console.error(`⚠️ BỎ QUA: Không tìm thấy thiết bị nào khớp với Feed Key: ${feedKey}.`);
            return;
        }

        if (feedKey === 'cambienanhsang') {
            updateHomepageSensor(data); // Gửi giá trị ánh sáng (%)
        }

        device.Device_status = newStatus;
        device.Status = newStatusBoolean; 
        await device.save();
        console.log(`✅ Device ${device.Device_name} status updated to ${newStatus}`);

        await Dialog.create({
            DeviceID : device._id, 
            Time: new Date(new Date().getTime() + 7 * 60 * 60 * 1000),
            Status_history: newStatus,
            Action: `User turn ${newStatus} the ${device.Device_name}`,
        });
        
        // Gửi POST đến Flask để emit SocketIO -> frontend realtime
        await axios.post('http://127.0.0.1:5000/device_update', {
            id: device._id.toString(),
            state: newStatusBoolean
        });
    } catch (error) {
        console.error('Error processing MQTT message:', error);
    }
});

client.on('error', (error) => { console.error('MQTT connection error:', error); });
client.on('close', () => { console.log('MQTT connection closed'); });


// ------------------------------------
// 2. EXPORT FUNCTIONS (ĐỊNH NGHĨA BẰNG CONST)
// ------------------------------------

// Hàm 1: Gửi lệnh MQTT (Dùng trong Scheduler)
const publishMessage = (feedKey, value) => {
    if (client && client.connected) {
        isLocalUpdate = true;
        const topic = `${AIO_USERNAME}/feeds/${feedKey}`; 
        client.publish(topic, String(value), { qos: 0, retain: false }, (err) => {
            if (err) { console.error(`[MQTT] Lỗi Publish tới ${topic}:`, err); } 
            else { console.log(`[MQTT] Đã gửi lệnh '${value}' tới Feed: ${feedKey}`); }
        });
        setTimeout(() => { isLocalUpdate = false; }, 3000); 
    } else {
        console.warn(`[MQTT] Không thể gửi lệnh. Client MQTT chưa kết nối hoặc đang bị lỗi.`);
    }
};

// Hàm 2: Close MQTT Connection
const closeMqttConnection = () => {
    client.end();
};

// Hàm 3: Get Feeds
const getFeeds = async () => {
    try {
        const url = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds`; 
        const res = await axios.get(url, { headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY }, });
        return res.data.map(feed => ({ name: feed.name, key: feed.key }));
    } catch (error) {
        throw new Error(`Failed to fetch feed list: ${error.message}`);
    }
};

// Hàm 4: Gửi Realtime tới Flask (FIX: Đã chuyển sang const)
const updateFlaskRealtime = async (id, state) => {
    try {
        await axios.post('http://127.0.0.1:5000/device_update', { id, state });
    } catch (err) {
        console.error('Lỗi khi gửi Realtime tới Flask:', err.message);
    }
};

// Hàm 5: Lấy dữ liệu Feed (FIX: Đã chuyển sang const)
const getFeedData = async (feedKey) => {
    try {
        const url = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data`;
        const res = await axios.get(url, { headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY }, });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to fetch feed data: ${error.message}`);
    }
};

// Hàm 6: Gửi lệnh HTTP (Dùng trong Route Toggle) (FIX: Đã chuyển sang const)
const sendFeedData = async (feedKey, value) => {
    try {
        const url = `https://io.adafruit.com/api/v2/${ADAFRUIT_IO_USERNAME}/feeds/${feedKey}/data`;
        const res = await axios.post(url, { value }, { headers: { 'X-AIO-Key': ADAFRUIT_IO_KEY }, });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to send feed data: ${error.message}`);
    }
};

// Hàm 7: Logic kiểm tra dữ liệu cảm biến để gửi cảnh báo
const checkSensorForAlerts = (feedKey, currentValue) => {
    // SENSOR_FEED là Feed Key chính xác: 'cambienanhsang'
    const SENSOR_FEED = 'cambienanhsang'; 
    const WARNING_THRESHOLD_HIGH = 80; // Ngưỡng cảnh báo ánh sáng mạnh
    const WARNING_THRESHOLD_LOW = 20;  // Ngưỡng cảnh báo ánh sáng yếu

    if (feedKey === SENSOR_FEED) {
        const currentNum = parseFloat(currentValue);

        if (isNaN(currentNum)) return; // Bỏ qua nếu không phải là số
            updateHomepageSensor(currentNum.toFixed(1));
            
        if (currentNum > WARNING_THRESHOLD_HIGH) {
            // Điều kiện cảnh báo: Ánh sáng quá mạnh
            const message = `⚠️ CẢNH BÁO: Ánh sáng trong phòng quá mạnh (${currentNum}%)!`;
            NotificationService.sendNotification('Warning', message);
        } else if (currentNum < WARNING_THRESHOLD_LOW) {
            // Điều kiện cảnh báo: Ánh sáng quá yếu
            const message = `💡 CẢNH BÁO: Ánh sáng trong phòng quá yếu (${currentNum}%)!`;
            NotificationService.sendNotification('Warning', message);
        } else {
            // Thông báo thông thường khi nằm trong ngưỡng an toàn
            const message = `Ánh sáng hiện tại là ${currentNum}%. Mức độ an toàn.`;
            NotificationService.sendNotification('Info', message);
        }
    }
};

// Hàm 8: Gửi chỉ số ánh sáng/nhiệt độ chính lên Flask để cập nhật Homepage
const updateHomepageSensor = async (value) => {
    try {
        await axios.post('http://127.0.0.1:5000/update_homepage_sensor', {
            value: value
        });
    } catch (err) {
        console.error('Lỗi khi gửi chỉ số Sensor lên Flask:', err.message);
    }
};

// Hàm 9: này xử lý cập nhật trạng thái thiết bị trong DB và tính toán thời gian chạy
const updateDeviceStateInDB = async (feedKey, newState) => {
    try {
        // Tìm thiết bị dựa trên AIO_FeedID (Tương đương với feedKey)
        const device = await Device.findOne({ AIO_FeedID: feedKey }); 
        
        if (!device) {
            console.warn(` BỎ QUA: Không tìm thấy thiết bị nào khớp với Feed Key: ${feedKey}`);
            return;
        }

        // Chuyển đổi trạng thái MQTT sang Boolean
        const isNowOn = (newState === 'ON' || newState === '1');
        
        const updateFields = {
            Status: isNowOn // Cập nhật trường Status (Boolean)
        };
        
        const currentTime = new Date();
        const isCurrentlyOn = device.Status; // Trạng thái hiện tại trong DB

        if (isNowOn && !isCurrentlyOn) {
            // Trường hợp 1: Thiết bị chuyển từ OFF -> ON
            updateFields.LastOnTime = currentTime;
            console.log(`[POWER MON] Thiết bị ${device.Device_name} bật lúc: ${currentTime.toISOString()}`);

        } else if (!isNowOn && isCurrentlyOn) {
            // Trường hợp 2: Thiết bị chuyển từ ON -> OFF
            
            if (device.LastOnTime) {
                // Tính toán thời gian đã chạy (milliseconds)
                const runDurationMs = currentTime.getTime() - new Date(device.LastOnTime).getTime();
                
                // Cộng dồn vào tổng thời gian chạy
                updateFields.TotalRunTimeMs = (device.TotalRunTimeMs || 0) + runDurationMs;
                updateFields.LastOnTime = null; // Reset thời gian bật cuối
                
                console.log(`[POWER MON] Thiết bị ${device.Device_name} tắt. Thời gian chạy: ${runDurationMs/1000} giây.`);
            } else {
                // Đảm bảo LastOnTime = null nếu thiết bị tắt
                updateFields.LastOnTime = null;
            }
        }
        
        // Cập nhật trạng thái và các trường thời gian
        await Device.updateOne({ _id: device._id }, updateFields);

    } catch (error) {
        console.error('Error updating device state and time in DB:', error);
    }
};

// ------------------------------------
// 3. KHỐI EXPORT CUỐI CÙNG (DÙNG module.exports = { ... })
// ------------------------------------
module.exports = {
    publishMessage,
    closeMqttConnection,
    getFeeds,
    updateFlaskRealtime, 
    getFeedData, 
    sendFeedData,
    updateHomepageSensor,
    updateDeviceStateInDB
};