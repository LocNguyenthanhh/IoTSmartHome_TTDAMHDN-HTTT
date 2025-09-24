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

// Thêm thiết bị mới
exports.createDevice = async (req, res) => {
  try {
    const { name, type, status } = req.body;

    const newDevice = await Device.create({
      name,
      type,
      status
    });

    res.status(201).json(newDevice);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi thêm thiết bị", error: err.message });
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
