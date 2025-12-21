// Author: NTLoc

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  // --- CÁC TRƯỜNG HIỆN TẠI (Được giữ nguyên) ---
  Type: String,             // <--- Giữ nguyên
  Device_status: String,    // <--- Giữ nguyên (Có thể dùng cho status dạng chuỗi như 'On'/'Off')
  
  // --- CHỨC NĂNG THÊM THIẾT BỊ ---
  Device_name: { type: String, required: true },  // Tên hiển thị của thiết bị
  AIO_FeedID: { type: String, required: true },   // Key của Adafruit Feed
  HomeID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Home",
    required: true
  },
  Status: { type: Boolean, default: false }, // Trạng thái dạng boolean (true/false)

  // --- POWER ANALYTICS ---
    
    // 1. Công suất tiêu thụ của thiết bị (Đơn vị: Watt)
    PowerConsumptionW: {
        type: Number,
        default: 60 // Giả sử mặc định là 60 Watt cho một bóng đèn
    },

    // 2. Timestamp lần cuối thiết bị được chuyển sang trạng thái ON
    LastOnTime: {
        type: Date,
        default: null
    },

    // 3. Trường để lưu tổng thời gian chạy (Đã tắt) tính bằng milliseconds
    TotalRunTimeMs: {
        type: Number,
        default: 0 
    },

  // --- CÁC TRƯỜNG THAM CHIẾU (Giữ nguyên) ---
  RoomID: {    
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    default: null // Cho phép null
  },
  UserID: {    
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

module.exports = mongoose.model('Device', deviceSchema);