// Backend/services/NotificationService.js

const Notification = require('../models/Notification');
const axios = require('axios'); // Để gửi POST tới Flask

// Hàm này được gọi từ bất cứ đâu trong Backend (Khi có sự kiện hoặc Rule chạy)
const sendNotification = async (type, message) => {
    try {
        // 1. Ghi vào Database để lưu lịch sử
        const newNotification = await Notification.create({
            Type: type,
            Message: message
        });

        // 2. Gửi tín hiệu Real-time tới Flask (Frontend)
        await axios.post('http://127.0.0.1:5000/send_notification', {
            id: newNotification._id,
            type: type,
            message: message,
            timestamp: newNotification.Timestamp
        });
        
        console.log(`[NOTIFY] Đã gửi thông báo Real-time: [${type}] ${message}`);

    } catch (error) {
        console.error('Lỗi khi gửi thông báo:', error.message);
    }
};

module.exports = {
    sendNotification
};