# IoT Smart Home Demo

Dự án demo hệ thống dùng **Node.js + MongoDB + Adafruit IO**  
để quản lý dữ liệu từ thiết bị IoT và gửi lệnh điều khiển.

---

## 🚀 Tính năng
- Nhận và lưu trữ dữ liệu cảm biến từ Micro:bit.
- Cung cấp REST API cho Frontend hoặc Dashboard.
- Gửi lệnh điều khiển từ Server → IoT thông qua Adafruit IO.
- Quản lý thiết bị và trạng thái trong MongoDB.

---

## 🛠️ Công nghệ sử dụng
- **Node.js + Express** – Backend server & REST API.
- **MongoDB + Mongoose** – Lưu trữ và thao tác dữ liệu.
- **Adafruit IO** – Giao tiếp IoT.
- **dotenv** – Quản lý biến môi trường.
- **cors** – Cho phép truy cập API từ Frontend.
- **mqtt**
- **Flask và socketIO**
---

## 📂 Cấu trúc thư mục
IOTSMARTHOME_TTDAMHDN-HTTT/
├── Backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── DeviceController.js
│   │   ├── DialogController.js
│   │   ├── feedController.js
│   │   ├── HomeController.js
│   │   ├── RoomController.js
│   │   └── UserController.js
│   ├── models/
│   │   ├── Device.js
│   │   ├── Dialog.js
│   │   ├── Home.js
│   │   ├── Room.js
│   │   └── User.js
│   ├── routes/
│   │   ├── DeviceRoute.js
│   │   ├── DialogRoute.js
│   │   ├── feedRoute.js
│   │   ├── HomeRoute.js
│   │   ├── RoomRoute.js
│   │   └── UserRoute.js
│   ├── seed/
│   │   ├── seedDevice.js
│   │   ├── seedDialog.js
│   │   ├── seedHome.js
│   │   ├── seedRoom.js
│   │   └── seedUser.js
│   ├── services/
│   │   └── adafruitServices.js
│   ├── Utils/
│   │   └── authMiddleware.js
│   └── main.js
└── FrontEnd/
|   ├── templates/
|   │   └── devicescontrol.html
|   └── devicescontrol.py
└── IoTGateWay/
|   └── IoTSmartHome_demo_button.json
└── .env
└── requirements.text
└── readme.md
|
...

---

## ⚡ Cài đặt & Chạy
1. **Clone** dự án:
   ```bash
   git clone https://github.com/LocNguyenthanhh/IoTSmartHome_TTDAMHDN-HTTT.git
2. **Cài dependencies**:
   ```bash
   npm install requirement.txt
   pip install flask jsonify requests flask_socketio

4. **Tạo file .env**:
   ```bash
   MONGO_URI= "MONGO_URI="mongodb+srv://dadnhttt:group1@cluster0.rotydvh.mongodb.net/mydb"

   PORT=3000 
   
   ADAFRUIT_AIO_USERNAME = "NTLoc"
   ADAFRUIT_AIO_KEY      = "aio_uAug74KEjnsR###wJ6G1jP7gbuuHQ9H" //delete triple ### before write into your .env file 
   AIO_LED_KEY           = "bbc-led"

6. **Chạy server**:
   ```bash
   node Backend\main.js
7. **Chạy frontend**:
   ```bash
   python FrontEnd\devicescontrol.py
