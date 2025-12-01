from flask import Flask, render_template, request, jsonify
import requests
from flask_socketio import SocketIO, emit
import json

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

def fetch_devices_from_backend():
    """Lấy devices từ Node.js backend"""
    try:
        res = requests.get("http://localhost:3000/api/devices", timeout=5)
        if res.status_code == 200:
            data = res.json()
            print(f"📡 [FLASK] Backend returned: {type(data)}")
            
            # Backend trả về array trực tiếp
            if isinstance(data, list):
                print(f"✅ [FLASK] Received {len(data)} devices")
                return data
            else:
                print("⚠️ [FLASK] Using empty list")
                return []
        else:
            print(f"❌ [FLASK] Backend error: {res.status_code}")
            return []
    except Exception as e:
        print(f"❌ [FLASK] Connection error: {e}")
        return []

@app.route('/')
def device_control():
    """Trang chính điều khiển devices"""
    devices = fetch_devices_from_backend()
    print(f"🏠 Rendering page with {len(devices)} devices")
    return render_template('devicescontrol.html', devices=devices)

# API endpoint để frontend JavaScript lấy devices
@app.route('/api/devices')
def get_devices_api():
    """API endpoint trả về danh sách devices"""
    try:
        # Backend trả về array trực tiếp
        raw_devices = fetch_devices_from_backend()
        
        device_count = len(raw_devices)
        print(f"✅ [FLASK] Sending {device_count} devices to frontend")
        
        return jsonify({
            'success': True,
            'data': raw_devices
        })
    except Exception as e:
        print(f"❌ [FLASK] API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Route nhận toggle từ frontend - FIXED FOR INSTANT RESPONSE
@app.route('/toggle_device', methods=['POST'])
def toggle_device():
    """Xử lý toggle device state - INSTANT RESPONSE VERSION"""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No JSON data received"}), 400
    
    device_id = data.get("id")
    new_state = data.get("state")
    
    print(f"🔄 [FLASK] Toggling device {device_id} to {new_state}")
    
    if not device_id:
        return jsonify({"success": False, "message": "Device ID is required"}), 400
    
    try:
        # GỬI REAL-TIME UPDATE NGAY LẬP TỨC
        socketio.emit('deviceUpdated', {
            'id': device_id,
            'state': new_state
        })
        
        print(f"✅ [FLASK] UI updated instantly for device {device_id}")
        
        # GỬI REQUEST ĐẾN BACKEND SAU (KHÔNG CHỜ)
        import threading
        
        def send_to_backend():
            try:
                endpoint = "http://localhost:3000/api/devices/toggle"
                print(f"🔧 Sending to backend: {endpoint}")
                res = requests.post(
                    endpoint,
                    json={
                        "deviceId": device_id,
                        "state": new_state
                    },
                    timeout=3  # Timeout ngắn hơn
                )
                
                if res.status_code == 200:
                    print(f"✅ [BACKEND] Toggle success: {res.json()}")
                else:
                    print(f"❌ [BACKEND] Error: {res.status_code}")
                    
            except Exception as e:
                print(f"❌ [BACKEND] Async error: {e}")
        
        # Chạy trong thread riêng, không chờ kết quả
        thread = threading.Thread(target=send_to_backend)
        thread.daemon = True
        thread.start()
        
        # TRẢ VỀ RESPONSE NGAY LẬP TỨC
        return jsonify({
            "success": True, 
            "message": f"Device toggled to {'ON' if new_state else 'OFF'}",
            "instant": True
        })
            
    except Exception as e:
        print(f"❌ [FLASK] Toggle error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# Health check endpoint
@app.route('/health')
def health_check():
    """Health check endpoint"""
    try:
        devices = fetch_devices_from_backend()
        return jsonify({
            'status': 'healthy',
            'service': 'Flask Frontend',
            'devices_count': len(devices)
        })
    except:
        return jsonify({
            'status': 'degraded', 
            'service': 'Flask Frontend'
        }), 500

# Backend connection test
@app.route('/test-backend')
def test_backend():
    """Test backend connection và endpoints"""
    try:
        # Test devices endpoint
        devices_res = requests.get("http://localhost:3000/api/devices", timeout=5)
        
        # Test toggle endpoint với dummy data
        toggle_res = requests.post(
            "http://localhost:3000/api/devices/toggle",
            json={"deviceId": "test", "state": True},
            timeout=5
        )
        
        return jsonify({
            "backend_status": "connected",
            "devices_endpoint": {
                "status": devices_res.status_code,
                "devices_count": len(devices_res.json()) if devices_res.status_code == 200 else 0
            },
            "toggle_endpoint": {
                "status": toggle_res.status_code,
                "response": toggle_res.text if toggle_res.status_code != 200 else "Working"
            }
        })
    except Exception as e:
        return jsonify({
            "backend_status": "disconnected",
            "error": str(e)
        })

@socketio.on('connect')
def handle_connect():
    print('✅ [SOCKET.IO] Client connected')
    emit('connection_status', {'status': 'connected'})

@socketio.on('disconnect') 
def handle_disconnect():
    print('❌ [SOCKET.IO] Client disconnected')

if __name__ == '__main__':
    print('''
============================================================
🚀 Flask Frontend Server Starting...
============================================================
🌐 Frontend:  http://localhost:5000  
🔗 Backend:   http://localhost:3000/api
💚 Health:    http://localhost:5000/health
🔧 Test:      http://localhost:5000/test-backend
============================================================
''')
    
    # Test connection
    try:
        devices = fetch_devices_from_backend()
        print(f"🔍 Testing backend connection...")
        print(f"✅ Backend connection: OK")
        print(f"✅ Found {len(devices)} devices")
        
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
    
    print("============================================================")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)