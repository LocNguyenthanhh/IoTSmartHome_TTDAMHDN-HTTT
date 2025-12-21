// Backend/controllers/contextController.js

const adafruitService = require('../services/adafruitServices');

// ÁP CỨNG ID CHO TOÀN BỘ HỆ THỐNG
const CONTEXT = {
    // ID Người dùng áp cứng từ seedUser.js
    USER_ID: "68d6cd6cf87a00e809bae67d", 
    // ID Nhà áp cứng từ seedHome.js
    HOME_ID: "68d6cc199a93a8f1c5499fa8", 
    
    // Danh sách Phòng áp cứng. Đảm bảo ID khớp với MongoDB Room Collection!
    ROOMS: [
        { name: "Living Room", id: "68d6cd6756f5196039b27c67" }, // ID từ seedRoom.js
        { name: "Kitchen", id: "68d6cd6756f5196039b27c69" }, // ID từ seedRoom.js
        { name: "Bedroom", id: "69313a6c6aece782e037afa8" }, 
        // ... Thêm các phòng khác
    ],
    DEVICE_TYPES: ["Light", "Fan", "TV", "CCTV"]
};

// API lấy toàn bộ Context và Feeds
exports.getContextAndFeeds = async (req, res) => {
    try {
        // ... (Logic lấy feeds giữ nguyên)
        // ...
    } catch(err) { /* ... */ }
};