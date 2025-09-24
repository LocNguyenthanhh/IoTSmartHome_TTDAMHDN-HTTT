// Author: NTLoc
// example from chatgpt



const express = require('express');
const mongoose = require('mongoose');
const dotenv = require("dotenv");      // <-- Dòng này PHẢI nằm trước khi gọi connectDB
const deviceRoutes = require('./routes/DeviceRoute');
const userRoutes = require('./routes/UserRoute');
const dialogRoutes = require('./routes/DialogRoute');
const homeRoutes = require('./routes/HomeRoute');
const roomRoutes = require('./routes/RoomRoute');

const connectDB = require('./config/db');

dotenv.config();
connectDB(); // Connect with MongoDB

const app = express();
app.use(express.json());

app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dialogs', dialogRoutes);
app.use('/api/homes', homeRoutes);
app.use('/api/rooms', roomRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
