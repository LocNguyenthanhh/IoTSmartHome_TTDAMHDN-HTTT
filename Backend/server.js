// Author: NTLoc
// example from chatgpt


const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const deviceRoutes = require('./routes/deviceRoutes');
const userRoutes = require('./routes/userRoutes');
const connectDB = require('./config/db');

dotenv.config();
connectDB(); // Kết nối MongoDB

const app = express();
app.use(express.json());

app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
