// Backend/models/Schedule.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduleSchema = new Schema({
  // Liên kết với thiết bị nào
  DeviceID: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  
  // Thời gian (HH:mm) cho lệnh BẬT
  TimeOn: {
    type: String, // Ví dụ: "07:30"
  },
  
  // Thời gian (HH:mm) cho lệnh TẮT (tùy chọn)
  TimeOff: {
    type: String, // Ví dụ: "23:00"
    default: null
  },
  
  // Địa điểm (Chỉ để hiển thị trên FE schedules.html)
  Location: {
    type: String, 
    required: true
  },

  // Note (Ghi chú)
  Note: {
    type: String,
    default: ""
  },
  
  // Trạng thái của Schedule: 'active' (đang chạy) hoặc 'inactive'
  IsActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Schedule', scheduleSchema);