const express = require("express");
const router = express.Router();
const dialogController = require("../controllers/DialogController");

// GET /api/dialogs -> Xem tất cả dialog
router.get("/", dialogController.getAllDialogs);

// POST /api/dialogs -> Thêm dialog mới
router.post("/", dialogController.createDialog);

// GET /api/history -> Lấy lịch sử (sẽ được Flask gọi)
router.get("/history", dialogController.getHistory);

module.exports = router;
