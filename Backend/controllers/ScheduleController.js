// Backend/controllers/ScheduleController.js

const Schedule = require('../models/Schedule');
const Device = require('../models/Device');

// Lấy tất cả lịch hẹn (có thể lọc sau này)
exports.getSchedules = async (req, res) => {
  try {
    // Lấy tất cả lịch hẹn và populate (nạp) thông tin Device
    const schedules = await Schedule.find().populate('DeviceID');
    res.status(200).json(schedules);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách lịch hẹn.", error: err.message });
  }
};

// Thêm một lịch hẹn mới
exports.createSchedule = async (req, res) => {
  try {
    const { DeviceID, Location, TimeOn, TimeOff, Note } = req.body;

    if (!DeviceID || !Location || !TimeOn) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc (DeviceID, Location, TimeOn)." });
    }

    const newSchedule = await Schedule.create({
      DeviceID,
      Location,
      TimeOn,
      TimeOff,
      Note
    });

    res.status(201).json(newSchedule);
    
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi tạo lịch hẹn.", error: err.message });
  }
};

// Cập nhật trạng thái/thông tin lịch hẹn
exports.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedSchedule = await Schedule.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!updatedSchedule) {
            return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
        }
        res.status(200).json(updatedSchedule);

    } catch (err) {
        res.status(500).json({ message: "Lỗi khi cập nhật lịch hẹn.", error: err.message });
    }
};

// Xóa lịch hẹn
exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSchedule = await Schedule.findByIdAndDelete(id);

        if (!deletedSchedule) {
            return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
        }
        res.status(200).json({ message: "Đã xóa lịch hẹn thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi xóa lịch hẹn.", error: err.message });
    }
};