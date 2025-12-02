// Author: HinHin
const express = require("express");
const router = express.Router();
const authController = require("../controllers/AuthController");
const authMiddleware = require("../middleware/auth");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes (require authentication)
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;