// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const feedRoutes = require('./routes/feedroute.js');
const deviceRoute = require("./routes/DeviceRoute.js");
//const authMiddleware = require('./Backend/authMiddleware.js'); // Nếu cần xác thực
const { watchDialogChanges } = require("./services/dialogWatcher");
const dialogRoute = require("./routes/DialogRoute.js");
const userRoute = require("./routes/UserRoute.js");
const contextController = require('./controllers/contextController');
const scheduleRoutes = require('./routes/ScheduleRoute');
const analyticsRoute = require('./routes/AnalyticsRoute');

// Load biến môi trường từ file .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Middleware để parse JSON

app.use((req, res, next) => {
    console.log(`📡 [TRAFFIC] Nhận yêu cầu: ${req.method} ${req.url}`);
    next();
});

app.get('/api/context', contextController.getContextAndFeeds);
app.use('/api/schedules', scheduleRoutes);

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {})
.then(() => {
  console.log('Connected to MongoDB');
  watchDialogChanges(); 
})
.catch((err) => console.error('MongoDB connection error:', err));

// Routes (có thể thêm authMiddleware nếu cần)
app.use('/feed', feedRoutes); // Route cho Adafruit IO
app.use('/api/users', userRoute);
app.use("/api/devices", deviceRoute); //Route cho ket noi FE
app.use("/api", dialogRoute); // Route cho dialog
app.use("/api", analyticsRoute); // Route cho Power Analytics

const { runScheduler } = require('./services/SchedulerService');
runScheduler();

// Khởi động server
const PORT = process.env.PORT || 3001;
// FIX: Lắng nghe trên mọi giao diện mạng (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} at 0.0.0.0`);
});

module.exports = app; // Xuất app nếu cần dùng trong test