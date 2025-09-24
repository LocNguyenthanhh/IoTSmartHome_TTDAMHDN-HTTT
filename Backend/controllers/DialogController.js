const Dialog = require("../models/Dialog");

// Lấy tất cả các dialog (populate DeviceID để lấy info của thiết bị)
exports.getAllDialogs = async (req, res) => {
  try {
    const dialogs = await Dialog.find().populate("DeviceID");
    res.status(200).json(dialogs);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách dialog", error: err.message });
  }
};

// Thêm mới một dialog
exports.createDialog = async (req, res) => {
  try {
    const { Status_history, Action, DeviceID } = req.body;

    const newDialog = await Dialog.create({
      Time: new Date(),
      Status_history,
      Action,
      DeviceID
    });

    res.status(201).json(newDialog);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi thêm dialog", error: err.message });
  }
};
