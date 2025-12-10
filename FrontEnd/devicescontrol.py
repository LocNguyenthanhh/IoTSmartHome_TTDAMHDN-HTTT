from flask import Flask, render_template, request, jsonify
import requests
from flask_socketio import SocketIO, emit
DEVIDE_ID = '69313a7d27fa074d0ad13d66'
app = Flask(__name__)
socketio = SocketIO(app)
#devices = []
devices = [
   {"id": DEVIDE_ID, "name": "Light bulbs", "brand": "Philips Hue", "state": True, "icon": "💡"},
   {"id": 2, "name": "Smart TV", "brand": "Panasonic", "state": False, "icon": "📺"},
   {"id": 3, "name": "Wi-Fi Router", "brand": "TP Link", "state": False, "icon": "📶"},
   {"id": 4, "name": "CCTV", "brand": "Security Camera 360°", "state": False, "icon": "📹"}
]


@app.route('/')
def device_control():
    # Gọi API Node.js
    global devices
    try:
        res = requests.get("http://localhost:3000/api/devices", timeout=5)
        devices = res.json()   # nhận JSON từ Node.js
    except Exception as e:
        devices = []           # fallback nếu Node.js lỗi
        print("Error fetching devices:", e)

    return render_template('devicescontrol.html', devices=devices)

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
            timeout=5
        )
        return jsonify(res.json())
    except Exception as e:
        print("Error sending to Node.js:", e)
        return jsonify({"success": False, "message": str(e)}), 500

#Automatic update
@app.route('/device_update', methods=['POST'])
def device_update_route():
    data = request.get_json()
    device_id = data.get('id')
    state = data.get('state')

    print(f"✅ Flask received update: ID={device_id}, State={state}")

    try:
        res = requests.get(
            f"http://localhost:3000/api/devices/{device_id}",
            timeout=5
        )
        if not res.ok:
            print("❌ Node responded non-200:", res.status_code, res.text)
            return jsonify({'success': False}), 500

        device = res.json()

    except Exception as e:
        print("❌ Cannot fetch device from Node.js:", e)
        return jsonify({'success': False}), 500
    if "id" not in device:
        device["id"] = device.get("_id")
    device['state'] = state
    socketio.emit("deviceUpdated", device)

    return jsonify({'success': True})

if __name__ == '__main__':
    socketio.run(app, debug=True)