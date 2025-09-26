require('dotenv').config();
const mongoose = require('mongoose');
const Home = require('../models/Home');   // model bạn muốn thêm dữ liệu

// Kết nối tới MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Dữ liệu mẫu
const homes = [
    { Address: '268 LTK P.Diên Hồng, TPHCM'}
];

// Hàm insert
(async () => {
try {
    //await Home.deleteMany();      // xóa cũ (nếu muốn)
    await Home.insertMany(homes); // thêm mới
        console.log('Seed data inserted');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
}
})();