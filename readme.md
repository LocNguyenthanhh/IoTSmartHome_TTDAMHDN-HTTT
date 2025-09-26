# IoT Smart Home Demo – Cloud Server

Dự án demo hệ thống **Cloud Server** dùng **Node.js + MongoDB + Adafruit IO**  
để quản lý dữ liệu từ thiết bị IoT và gửi lệnh điều khiển.

---

## 🚀 Tính năng
- Nhận và lưu trữ dữ liệu cảm biến từ IoT Gateway (Micro:bit).
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

---

## 📂 Cấu trúc thư mục
IOTSMARTHOME_TTDAMHDN-HTTT/
│
├─ Backend/                        # Mã nguồn backend
│  ├─ config/                      # Cấu hình
│  │   └─ db.js                    # Kết nối MongoDB
│  │
│  ├─ controllers/                 # Xử lý logic API
│  │   ├─ DeviceController.js
│  │   ├─ DialogController.js
│  │   └─ UserController.js
│  │
│  ├─ models/                      # Định nghĩa schema MongoDB (Mongoose)
│  │   ├─ Device.js
│  │   ├─ Dialog.js
│  │   ├─ Home.js
│  │   ├─ Room.js
│  │   └─ User.js
│  │
│  ├─ routes/                      # Định nghĩa các route API
│  │   ├─ DeviceRoute.js
│  │   ├─ DialogRoute.js
│  │   └─ UserRoute.js
│  │
│  ├─ services/                    # Xử lý nghiệp vụ chung
│  │   └─ Service.js
│  │
│  ├─ Utils/                       # Tiện ích, middleware
│  │   └─ authMiddleware.js
│  │
│  └─ server.js                    # Điểm khởi động server Express
│
├─ FrontEnd/                       # Giao diện người dùng (web/app)
│   └─ ...                         # (HTML/CSS/JS hoặc React/Vue)
│
├─ IoT_Gateway/                    # Code cho gateway (Python, micro:bit)
│   └─ ...                         # Kết nối thiết bị và gửi dữ liệu
│
├─ readme.md                       # Hướng dẫn dự án
└─ requirements.txt                # Danh sách package (nếu dùng Python cho gateway)


---

## ⚡ Cài đặt & Chạy
1. **Clone** dự án:
   ```bash
   git clone https://github.com/LocNguyenthanhh/IoTSmartHome_TTDAMHDN-HTTT.git
2. **Cài dependencies**:
    npm install requirement.txt

3. **Tạo file .env**:
    MONGO_URI=mongodb://localhost:27017/IoTSmartHome
    PORT=27017 

    ADAFRUIT_AIO_USERNAME = "NTLoc"
    ADAFRUIT_AIO_KEY      = "aio_hDTi82luasd9t9StQRX6vZZFo2rD"
    AIO_LED_KEY           = "bbc-led"

4. **Chạy server**:
    npm run dev
Hoặc:
    node Backend\server.js
