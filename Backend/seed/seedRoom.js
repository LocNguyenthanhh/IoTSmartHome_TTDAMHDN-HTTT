require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');   // model bạn muốn thêm dữ liệu

// Kết nối tới MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

const Homeid = "68d6cc199a93a8f1c5499fa8"
// Dữ liệu mẫu
const rooms = [
    { Room_name: 'Living Room' , HomeID : Homeid},
    { Room_name: 'Bedroom' , HomeID : Homeid},
    { Room_name: 'Kitchen' , HomeID : Homeid}
];

// Hàm insert
(async () => {
try {
    //await Room.deleteMany();      // xóa cũ (nếu muốn)
    await Room.insertMany(rooms); // thêm mới
        console.log('Seed data inserted');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
