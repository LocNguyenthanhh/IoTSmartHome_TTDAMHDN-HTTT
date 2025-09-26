// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const feedRoutes = require('./routes/feedroute.js');
const deviceRoute = require("./routes/DeviceRoute.js");
//const authMiddleware = require('./Backend/authMiddleware.js'); // Nếu cần xác thực

// Load biến môi trường từ file .env
dotenv.config();

const app = express();

// Middleware để parse JSON
app.use(express.json());

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes (có thể thêm authMiddleware nếu cần)
app.use('/feed', feedRoutes); // Route cho Adafruit IO
app.use("/api", deviceRoute); //Route cho ket noi FE
// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Xuất app nếu cần dùng trong test