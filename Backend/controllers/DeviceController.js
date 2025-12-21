const Device = require("../models/Device");

// Lấy danh sách tất cả devices
exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.find();
    res.status(200).json(devices);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách thiết bị", error: err.message });
  }
};

// File: DeviceController.js (Chỉ phần createDevice)

// File: DeviceController.js (Thay thế hàm exports.createDevice)

exports.createDevice = async (req, res) => {
  try {
    // Nhận các trường từ Frontend
    const { Device_type, AIO_FeedID, HomeID, UserID, RoomID } = req.body; 

    // Kiểm tra dữ liệu bắt buộc (Sẽ luôn có từ Frontend mới)
    if (!Device_type || !AIO_FeedID || !HomeID || !UserID) {
        return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc. Vui lòng kiểm tra HomeID và UserID cố định." });
    }

    const newDevice = await Device.create({
      // Gán Device_name = Device_type (THEO QUY TẮC CỦA BẠN)
      Device_name: Device_type, 
      
      // Gán các ID đã được áp cứng từ Frontend
      AIO_FeedID: AIO_FeedID,
      HomeID: HomeID, // HomeID: "68d6cc199a93a8f1c5499fa8"
      UserID: UserID, // UserID: "69313a731565f8757e2591cc"

      // Các trường còn lại
      Type: Device_type,       
      Device_status: 'OFF',    
      Status: false,
      RoomID: RoomID || null, 
    });
    
    res.status(201).json(newDevice);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi thêm thiết bị. Vui lòng kiểm tra các ID và FeedID.", error: err.message });
  }
};

// Cập nhật thông tin thiết bị (ví dụ: status)
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body; // có thể {status} hoặc nhiều field khác

    const updatedDevice = await Device.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedDevice) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }
    res.status(200).json(updatedDevice);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi cập nhật thiết bị", error: err.message });
  }
};

// Xóa thiết bị
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedDevice = await Device.findByIdAndDelete(id);
    if (!deletedDevice) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }
    res.status(200).json({ message: "Đã xóa thiết bị thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xóa thiết bị", error: err.message });
  }
};
