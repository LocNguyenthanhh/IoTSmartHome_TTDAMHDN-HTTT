from flask import Flask, render_template, request, jsonify
import requests
from flask_socketio import SocketIO, emit
from datetime import datetime, timezone

DEVIDE_ID = '69313a7d27fa074d0ad13d66'
app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.auto_reload = True
socketio = SocketIO(app, cors_allowed_origins=[
    "http://127.0.0.1:5000",
    "http://localhost:5000",
    "http://127.0.0.1:5500",  # nếu bạn mở dashboard bằng Live Server VSCode
    "http://localhost:5500"
])
#devices = []
devices = [
   {"id": DEVIDE_ID, "name": "Light bulbs", "brand": "Philips Hue", "state": True, "icon": "💡"},
   {"id": 2, "name": "Smart TV", "brand": "Panasonic", "state": False, "icon": "📺"},
   {"id": 3, "name": "Wi-Fi Router", "brand": "TP Link", "state": False, "icon": "📶"},
   {"id": 4, "name": "CCTV", "brand": "Security Camera 360°", "state": False, "icon": "📹"}
]

# ====== HISTORY STORAGE (A) ======
# DIALOG_HISTORY = []
# MAX_HISTORY = 500  # giữ tối đa 500 events, đủ cho dashboard
# =================================

@app.route("/devicescontrol")
def device_control():
    global devices
    try:
        res = requests.get("http://localhost:3000/api/devices", timeout=10)
        devices = res.json()
    except Exception as e:
        devices = []
        print("Error fetching devices:", e)

    return render_template("devicescontrol.html", devices=devices)

# Route nhận toggle từ frontend
@app.route('/toggle_device', methods=['POST'])
def toggle_device():
    data = request.get_json()
    device_id = data.get("id")
    new_state = data.get("state")
    
    try:
        res = requests.post(
            "http://localhost:3000/api/devices/toggle",
            json={"id": device_id, "state": new_state},
            timeout=10
        )
        return jsonify(res.json())
    except Exception as e:
        print("Error sending to Node.js:", e)
        return jsonify({"success": False, "message": str(e)}), 500

# Automatic update
@app.route('/device_update', methods=['POST'])
def device_update_route():
    data = request.get_json()
    device_id = data.get('id')
    state = data.get('state')

    print(f"✅ Flask received update: ID={device_id}, State={state}")

    try:
        res = requests.get(
            f"http://localhost:3000/api/devices/{device_id}",
            timeout=10
        )
        if not res.ok:
            print("❌ Node responded non-200:", res.status_code, res.text)
            return jsonify({'success': False}), 500

        device = res.json()

    except Exception as e:
        print("❌ Cannot fetch device from Node.js:", e)
        return jsonify({'success': False}), 500

    # đảm bảo có field id
    if "id" not in device:
        device["id"] = device.get("_id")

    device['state'] = state

    # ====== (A) tạo payload lịch sử cho dashboard ======
    dialog_payload = {
    "deviceId": device["id"],
    "status": "ON" if state in [True, "ON", 1, "true", "True"] else "OFF",
    "time": data.get("time") or datetime.now(timezone.utc).isoformat(),
    "action": data.get("action") or "device_update"
    }

    # lưu vào lịch sử
    #DIALOG_HISTORY.append(dialog_payload)
    #if len(DIALOG_HISTORY) > MAX_HISTORY:
    #    DIALOG_HISTORY.pop(0)
    # ====================================================

    # emit cho FE điều khiển (giữ như cũ)
    socketio.emit("deviceUpdated", device)

    # emit cho dashboard realtime
    socketio.emit("dialogUpdated", dialog_payload)

    return jsonify({'success': True})

@app.route("/dialog_history", methods=["GET"])
def dialog_history():
    try:
        # Gọi API mới đã tạo ở Node.js (chạy ở cổng 3000)
        NODE_API_URL = "http://localhost:3000/api/history?limit=1000" 
        
        # Gửi request tới Node.js để lấy lịch sử
        res = requests.get(NODE_API_URL, timeout=10)
        
        if res.ok:
            data = res.json()
            
            # <--- BẮT ĐẦU THÊM LỆNH DEBUG --- >
            print("=====================================================")
            print("🚀 Dữ liệu Lịch sử nhận được từ Node.js (MongoDB):")
            # In ra 5 bản ghi đầu tiên để kiểm tra sự mới nhất
            print(data[:5]) 
            print("=====================================================")
            # <--- KẾT THÚC THÊM LỆNH DEBUG --- >
            
            # Trả về dữ liệu lịch sử từ MongoDB
            return jsonify(data) 
        else:
            print(f"❌ Lỗi khi lấy lịch sử từ Node.js: Status {res.status_code}, Response: {res.text}")
            return jsonify({"message": "Failed to load history from Node.js backend"}), 500

    except requests.exceptions.RequestException as e:
        print(f"❌ Lỗi kết nối tới Node.js: {e}")
        return jsonify({"message": "Backend service (Node.js) unavailable"}), 500

@app.route("/")
def home():
    return render_template("homepage.html")


@app.route("/analytics")
def analytics():
    return render_template("analytics.html")

@app.route("/history")
def history():
    # Thêm timestamp hiện tại để tránh cache (versioning)
    version = datetime.now().timestamp()
    return render_template("history.html", version=version)

@app.route("/schedules")
def schedules():
    return render_template("schedules.html")

# ==================ACCOUNT-LOGIN==================================

@app.route('/create-account')
def create_account():
    return render_template('createaccount.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/account')
def account_page():
    return render_template('account.html')

# Route cho trang Quên mật khẩu
@app.route('/forgot-password')
def forgot_password_page():
    return render_template('forgotpassword.html')

# Route cho trang Đặt lại mật khẩu (nhận token động)
@app.route('/reset-password/<token>')
def reset_password_page(token):
    return render_template('resetpassword.html') # Flask sẽ render trang Reset Password

# Route nhận thông báo từ Node.js (Bước 1 của Notification)
@app.route('/send_notification', methods=['POST'])
def handle_notification():
    # Node.js gửi POST request đến endpoint này
    data = request.json
    
    # Emit thông báo tới tất cả các client đã kết nối Socket.IO
    # Sự kiện 'new_notification' sẽ được Frontend (JavaScript) lắng nghe
    socketio.emit('new_notification', data)
    print(f"[FLASK NOTIFY] Emitted: {data['type']} - {data['message']}")
    return jsonify({"status": "received"}), 200

# Route nhận chỉ số cảm biến từ Node.js và emit lên Frontend
@app.route('/update_homepage_sensor', methods=['POST'])
def update_homepage_sensor_route():
    data = request.json
    sensor_value = data.get('value')
    
    # Emit sự kiện mới chỉ dành cho chỉ số chính của Homepage
    socketio.emit('homepage_sensor_update', {
        'value': sensor_value
    })
    
    return jsonify({"status": "received"}), 200

# ====================================================
if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=5000, debug=True)

