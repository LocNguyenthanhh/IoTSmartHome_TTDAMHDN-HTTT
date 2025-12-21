require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');   // model bạn muốn thêm dữ liệu

// Kết nối tới MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

const Homeid = "68d6cc199a93a8f1c5499fa8"
// Dữ liệu mẫu
const users = [
    { User_name: 'group_1',
    Phone_No: '0909 090 909',
    email: 'group1.iot@gmail.com',
    Password: 'thisisgroup1',
    HomeID: Homeid}
];

// Hàm insert
(async () => {
try {
    //await User.deleteMany();      // xóa cũ (nếu muốn)
    await User.insertMany(users); // thêm mới
        console.log('Seed data inserted');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
}
})();