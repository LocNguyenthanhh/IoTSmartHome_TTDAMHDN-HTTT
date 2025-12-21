require('dotenv').config();
const mongoose = require('mongoose');
const Device = require('../models/Device');   // model bạn muốn thêm dữ liệu

// Kết nối tới MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const Userid = "68d6cd6cf87a00e809bae67d"
const LivingRoomid = "68d6cd6756f5196039b27c67"
const Kitchenid = "68d6cd6756f5196039b27c69"
const devices = [
    {   Type: 'LED',
        Device_status: 'On' ,
        UserID : Userid,
        RoomID : LivingRoomid},
    {   Type: 'LED',
        Device_status: 'Off',
        UserID : Userid,
        RoomID : Kitchenid}
];

// Hàm insert
(async () => {
try {
    //await Device.deleteMany();      // xóa cũ (nếu muốn)
    await Device.insertMany(devices); // thêm mới
        console.log('Seed data inserted');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
}
})();