// Backend/services/SchedulerService.js
const Schedule = require('../models/Schedule');
const { publishMessage } = require('./adafruitServices'); // Cần hàm publish đã có

// Lưu ID của các schedule đã chạy trong phút hiện tại để tránh chạy lại
let executedSchedules = new Set(); 

const runScheduler = () => {
  const checkTime = () => {
    const now = new Date();
    // Lấy giờ và phút hiện tại ở định dạng "HH:mm" (ví dụ: "07:30")
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Reset set mỗi phút để cho phép các schedule chạy lại
    if (now.getSeconds() < 1) { 
        executedSchedules.clear();
    }

    // 1. Tìm tất cả lịch hẹn đang hoạt động
    Schedule.find({ IsActive: true })
      .populate('DeviceID')
      .then(schedules => {
        schedules.forEach(schedule => {
          if (!schedule.DeviceID) return; // Bỏ qua nếu không tìm thấy Device

          const device = schedule.DeviceID;
          const scheduleId = schedule._id.toString();

          // Kiểm tra lệnh BẬT
          if (schedule.TimeOn === currentTime && !executedSchedules.has(`${scheduleId}-on`)) {
            console.log(`[SCHEDULER] BẬT cho ${device.Device_name} (${device.AIO_FeedID}) lúc ${currentTime}`);
            publishMessage(device.AIO_FeedID, '1');
            executedSchedules.add(`${scheduleId}-on`);
          }

          // Kiểm tra lệnh TẮT
          if (schedule.TimeOff === currentTime && schedule.TimeOff !== null && !executedSchedules.has(`${scheduleId}-off`)) {
            console.log(`[SCHEDULER] TẮT cho ${device.Device_name} (${device.AIO_FeedID}) lúc ${currentTime}`);
            publishMessage(device.AIO_FeedID, '0');
            executedSchedules.add(`${scheduleId}-off`);
          }
        });
      })
      .catch(err => console.error("Lỗi khi chạy Scheduler:", err.message));
  };
  
  // Chạy kiểm tra mỗi 15 giây (Giảm xuống 15 giây để tăng độ chính xác)
  setInterval(checkTime, 15000); 
};

module.exports = { runScheduler };