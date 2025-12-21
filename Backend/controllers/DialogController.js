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


// Lấy lịch sử dialog từ MongoDB (được gọi từ Flask)
exports.getHistory = async (req, res) => {
    try {
        // Lấy tham số limit từ query string (VD: /api/history?limit=50), mặc định 50
        const limit = parseInt(req.query.limit) || 50; 
        
        // Truy vấn MongoDB: Sắp xếp theo Time giảm dần (mới nhất trước) và giới hạn
        const history = await Dialog.find({})
            .sort({ Time: -1 })        
            .lean();            

        // Định dạng lại dữ liệu để Flask dễ sử dụng
        const formattedHistory = history.map(doc => ({
            deviceId: doc.DeviceID?.toString(), 
            status: doc.Status_history,       
            time: doc.Time.toISOString(),     
            action: doc.Action                
        }));

        res.status(200).json(formattedHistory);
    } catch (err) {
        console.error("❌ Lỗi khi lấy lịch sử dialog:", err);
        res.status(500).json({ message: "Internal server error." });
    }
};

