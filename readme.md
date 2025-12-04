# IoT Smart Home Project

Dự án hệ thống thông dùng **NodeJS + ExpressJS + MongoDB + Adafruit IO**  
để quản lý năng lượng trong gia đình thông qua các thiết bị IoT và gửi lệnh điều khiển.

---

## Công nghệ sử dụng
- **NodeJS + ExpressJS** – Backend server & REST API.
- **MongoDB + Mongoose + Mongo Atlas** – Lưu trữ và thao tác dữ liệu NoSQL.
- **Adafruit IO** – Giao tiếp IoT.
- **dotenv** – Quản lý biến môi trường.
- **cors** – Cho phép truy cập API từ Frontend.
- **mqtt**
- **Flask và socketIO** - Giao tiếp FE và BE
---

## Cấu trúc thư mục
```text
IOTSMARTHOME_TTDAMHDN-HTTT/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── DeviceController.js
│   │   ├── DialogController.js
│   │   ├── FeedController.js
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
│   │   ├── FeedRoute.js
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
│   │   └── AdafruitService.js
│   ├── utils/
│   │   └── authMiddleware.js
│   └── main.js
├── frontend/
│   ├── templates/
│   │   └── devices_control.html
│   └── devices_control.py
├── iot_gateway/
│   └── IoTSmartHome_demo_button.json
├── .env
├── README.md
└── requirements.txt
```

---

## Cài đặt & Chạy
1. **Clone** dự án:
   ```bash
   git clone https://github.com/LocNguyenthanhh/IoTSmartHome_TTDAMHDN-HTTT.git
2. **Cài dependencies**:
   ```bash
   npm install requirement.txt
   pip install flask jsonify requests flask_socketio

4. **Tạo file .env**:
   ```bash
   MONGO_URI= "mongodb+srv://dadnhttt:group1@cluster0.rotydvh.mongodb.net/mydb"

   PORT=3000 
   
   ADAFRUIT_AIO_USERNAME = "NTLoc"
   ADAFRUIT_AIO_KEY      = "aio_uAug74KEjnsR_###_wJ6G1jP7gbuuHQ9H" //delete triple _###_ before write into your .env file 
   AIO_LED_KEY           = "bbc-led"
   AIO_SENSOR_LIGHT_KEY  = "sensor-light"
6. **Chạy server**:
   ```bash
   node Backend\main.js
7. **Chạy frontend**:
   ```bash
   python FrontEnd\devicescontrol.py
