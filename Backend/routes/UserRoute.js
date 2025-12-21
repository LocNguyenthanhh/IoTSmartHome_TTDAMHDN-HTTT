const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserController");

// Route Đăng ký: POST /api/users/register
router.post("/register", userController.register);

// THÊM DÒNG NÀY (Route Đăng nhập): POST /api/users/login
router.post("/login", userController.login); 

// Route lấy danh sách user (cũ)
router.get("/", userController.getUsers);
// Route Quên mật khẩu
router.post("/forgot-password", userController.forgotPassword);
// Route Đặt lại mật khẩu (Token là tham số trên URL)
router.post("/reset-password/:token", userController.resetPassword);
router.post("/change-password", userController.changePassword);

module.exports = router;