from flask import Flask, render_template, request, jsonify
import requests
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)
devices = [
    {"id": "68d6ce1d5301347504febdd7", "name": "Light bulbs", "brand": "Philips Hue", "state": True, "icon": "💡"},
    {"id": 2, "name": "Smart TV", "brand": "Panasonic", "state": False, "icon": "📺"},
    {"id": 3, "name": "Wi-Fi Router", "brand": "TP Link", "state": False, "icon": "📶"},
    {"id": 4, "name": "CCTV", "brand": "Security Camera 360°", "state": False, "icon": "📹"}
]


@app.route('/')
def device_control():
    # Gọi API Node.js
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
            "http://localhost:3000/api/toggle",
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
    
    # Cập nhật danh sách device trong memory
    for d in devices:
        if str(d['id']) == str(device_id):
            d['state'] = state
            # emit event SocketIO để FE realtime update
            socketio.emit('deviceUpdated', d, broadcast=True)
            break

    return jsonify({'success': True})

if __name__ == '__main__':
    socketio.run(app, debug=True)
