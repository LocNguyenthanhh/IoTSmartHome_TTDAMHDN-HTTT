// Backend/routes/AnalyticsRoute.js

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/power -> Lấy dữ liệu công suất và tổng năng lượng
router.get('/analytics/power', analyticsController.getPowerAnalytics);

module.exports = router;