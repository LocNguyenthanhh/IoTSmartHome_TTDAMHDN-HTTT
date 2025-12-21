const Home = require('../models/Home');

// Lấy danh sách tất cả Home
exports.getHomes = async (req, res) => {
  try {
    const homes = await Home.find();
    res.json(homes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy 1 Home theo ID
exports.getHomeById = async (req, res) => {
  try {
    const home = await Home.findById(req.params.id);
    if (!home) return res.status(404).json({ message: "Home not found" });
    res.json(home);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Thêm mới Home
exports.createHome = async (req, res) => {
  try {
    const home = new Home(req.body);
    const saved = await home.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật Home
exports.updateHome = async (req, res) => {
  try {
    const updated = await Home.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Home not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Xóa Home
exports.deleteHome = async (req, res) => {
  try {
    const deleted = await Home.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Home not found" });
    res.json({ message: "Home deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
