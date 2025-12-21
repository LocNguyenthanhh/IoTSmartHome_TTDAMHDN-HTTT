// Backend/models/Notification.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    // Loại thông báo (Cảnh báo, Thông tin, Lỗi)
    Type: {
        type: String, 
        enum: ['Warning', 'Info', 'Error'],
        default: 'Info'
    },
    
    // Nội dung thông báo
    Message: {
        type: String, 
        required: true
    },
    
    // Thời gian tạo
    Timestamp: {
        type: Date,
        default: Date.now
    },
    
    // Trạng thái đã xem hay chưa
    IsRead: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Notification', notificationSchema);