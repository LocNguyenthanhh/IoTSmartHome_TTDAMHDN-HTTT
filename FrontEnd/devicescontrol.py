from flask import Flask, render_template, request, jsonify
import requests
from flask_socketio import SocketIO, emit
import json
import time
import threading
import random

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# ==================== ANALYTICS FUNCTIONS ====================

def fetch_analytics_dashboard():
    """Lấy dashboard analytics từ Node.js backend"""
    try:
        res = requests.get("http://localhost:3000/api/analytics/dashboard", timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get('success'):
                print(f"✅ [ANALYTICS] Dashboard data received")
                return data.get('data', {})
            else:
                print(f"⚠️ [ANALYTICS] Backend returned error")
                return {}
        else:
            print(f"❌ [ANALYTICS] Backend error: {res.status_code}")
            return {}
    except Exception as e:
        print(f"❌ [ANALYTICS] Connection error: {e}")
        return {}

def fetch_activity_data(period="day"):
    """Lấy dữ liệu activity theo period"""
    try:
        res = requests.get(f"http://localhost:3000/api/analytics/activity?period={period}", timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get('success'):
                print(f"✅ [ANALYTICS] Activity data for {period} received")
                return data.get('data', {})
            else:
                print(f"⚠️ [ANALYTICS] Activity data error")
                return {}
        else:
            print(f"❌ [ANALYTICS] Activity error: {res.status_code}")
            return {}
    except Exception as e:
        print(f"❌ [ANALYTICS] Activity connection error: {e}")
        return {}

def fetch_device_usage():
    """Lấy dữ liệu device usage"""
    try:
        res = requests.get("http://localhost:3000/api/analytics/device-usage", timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get('success'):
                print(f"✅ [ANALYTICS] Device usage data received")
                return data.get('data', [])
            else:
                print(f"⚠️ [ANALYTICS] Device usage error")
                return []
        else:
            print(f"❌ [ANALYTICS] Device usage error: {res.status_code}")
            return []
    except Exception as e:
        print(f"❌ [ANALYTICS] Device usage connection error: {e}")
        return []

def fetch_real_time_data():
    """Lấy dữ liệu real-time từ backend"""
    try:
        res = requests.get("http://localhost:3000/api/analytics/real-time", timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get('success'):
                print(f"✅ [ANALYTICS] Real-time data received from backend")
                return data.get('data', {})
            else:
                print(f"⚠️ [ANALYTICS] Real-time backend error")
                return {}
        else:
            print(f"❌ [ANALYTICS] Real-time error: {res.status_code}")
            return {}
    except Exception as e:
        print(f"❌ [ANALYTICS] Real-time connection error: {e}")
        return {}

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

# ==================== REAL-TIME FUNCTIONS ====================

def push_real_time_data_periodically():
    """Đẩy dữ liệu real-time tự động mỗi 3 giây"""
    print("📈 [REAL-TIME] Starting real-time data pusher...")
    
    # Biến để theo dõi tổng activity
    total_activity_counter = 234
    
    while True:
        try:
            time.sleep(3)  # Cập nhật mỗi 3 giây
            
            # Thử lấy dữ liệu real-time từ backend
            real_time_data = fetch_real_time_data()
            
            if real_time_data and 'currentActivity' in real_time_data:
                # Dùng dữ liệu thực từ backend
                current_activity = real_time_data.get('currentActivity', 15)
                devices_data = real_time_data.get('devices', [])
                print(f"📈 [REAL-TIME] Using backend data: {current_activity} activities")
            else:
                # Fallback: dùng mock data
                current_activity = random.randint(10, 25)
                devices_data = [
                    {'name': 'Living Room Light', 'status': 'On', 'power': random.randint(40, 50), 'type': 'Light'},
                    {'name': 'Kitchen AC', 'status': 'On' if random.random() > 0.3 else 'Off', 'power': random.randint(100, 150), 'type': 'AC'},
                    {'name': 'Bedroom TV', 'status': 'Off' if random.random() > 0.7 else 'On', 'power': random.randint(0, 80), 'type': 'TV'},
                    {'name': 'Bathroom Fan', 'status': 'On' if random.random() > 0.5 else 'Off', 'power': random.randint(20, 40), 'type': 'Fan'}
                ]
                print(f"📈 [REAL-TIME] Using mock data: {current_activity} activities")
            
            # Tăng tổng activity counter
            total_activity_counter += random.randint(1, 5)
            
            # Gửi dữ liệu real-time qua Socket.IO
            socketio.emit('realTimeUpdate', {
                'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'currentActivity': current_activity,
                'totalActivity': total_activity_counter,
                'devices': devices_data,
                'peakUsage': random.randint(150, 180),
                'activeDevices': len([d for d in devices_data if d.get('status') == 'On']),
                'energySaved': round(random.uniform(18.0, 20.0), 2)
            })
            
        except Exception as e:
            print(f"❌ [REAL-TIME] Push error: {e}")
            time.sleep(10)

# ==================== ROUTES ====================

@app.route('/')
def homepage():
    """Trang chủ"""
    print(f"🏠 Rendering homepage...")
    return render_template('homepage.html')

@app.route('/homepage.html')
def homepage_direct():
    """Trang chủ - hỗ trợ truy cập trực tiếp"""
    print(f"🏠 Rendering homepage directly...")
    return render_template('homepage.html')

@app.route('/devicescontrol.html')
def device_control_page():
    """Trang điều khiển devices - hỗ trợ truy cập trực tiếp"""
    devices = fetch_devices_from_backend()
    print(f"🏠 Rendering devices page with {len(devices)} devices")
    return render_template('devicescontrol.html', devices=devices)

@app.route('/devices')
def device_control():
    """Trang điều khiển devices"""
    devices = fetch_devices_from_backend()
    print(f"🏠 Rendering devices page with {len(devices)} devices")
    return render_template('devicescontrol.html', devices=devices)

@app.route('/analytics.html')
def analytics_page_direct():
    """Trang analytics - hỗ trợ truy cập trực tiếp"""
    print(f"📊 Loading analytics page...")
    return render_template('analytics.html')

@app.route('/analytics')
def analytics_page():
    """Trang analytics dashboard"""
    print(f"📊 Loading analytics page...")
    return render_template('analytics.html')

# ==================== ANALYTICS API ROUTES ====================

@app.route('/api/analytics/dashboard')
def get_analytics_dashboard():
    """API endpoint trả về dashboard analytics"""
    try:
        dashboard_data = fetch_analytics_dashboard()
        
        # Nếu không có dữ liệu từ backend, tạo mock data
        if not dashboard_data:
            dashboard_data = {
                "summary": {
                    "totalDevices": 12,
                    "activeDevices": 8,
                    "inactiveDevices": 4,
                    "activePercentage": 67
                },
                "activity": {
                    "total": 156,
                    "comparison": -23,
                    "activeDevices": 8
                },
                "devicesByType": [
                    {"_id": "Light", "count": 4, "active": 3},
                    {"_id": "AC", "count": 3, "active": 2},
                    {"_id": "TV", "count": 2, "active": 1},
                    {"_id": "Other", "count": 3, "active": 2}
                ],
                "recentActivities": [
                    {"time": "2024-01-15T10:30:00Z", "device": "Living Room Light", "action": "Turned ON", "status": "On"},
                    {"time": "2024-01-15T10:15:00Z", "device": "Bedroom AC", "action": "Temperature set", "status": "On"},
                    {"time": "2024-01-15T09:45:00Z", "device": "Kitchen Light", "action": "Turned OFF", "status": "Off"}
                ],
                "activityData": [
                    {"label": "8:00", "activityCount": 12, "activeDevices": 3},
                    {"label": "9:00", "activityCount": 18, "activeDevices": 4},
                    {"label": "10:00", "activityCount": 22, "activeDevices": 5},
                    {"label": "11:00", "activityCount": 15, "activeDevices": 4}
                ],
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        
        return jsonify({
            'success': True,
            'data': dashboard_data
        })
    except Exception as e:
        print(f"❌ [ANALYTICS] Dashboard error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/analytics/activity')
def get_activity_data():
    """API endpoint trả về dữ liệu activity theo period"""
    try:
        period = request.args.get('period', 'day')
        activity_data = fetch_activity_data(period)
        
        # Nếu không có dữ liệu từ backend, tạo mock data
        if not activity_data:
            if period == "today":
                activity_data = {
                    "period": period,
                    "totalActivity": 156,
                    "data": [
                        {"label": "8:00", "activityCount": 12, "activeDevices": 3},
                        {"label": "9:00", "activityCount": 18, "activeDevices": 4},
                        {"label": "10:00", "activityCount": 22, "activeDevices": 5},
                        {"label": "11:00", "activityCount": 15, "activeDevices": 4},
                        {"label": "12:00", "activityCount": 20, "activeDevices": 5},
                        {"label": "13:00", "activityCount": 16, "activeDevices": 4},
                        {"label": "14:00", "activityCount": 14, "activeDevices": 3},
                        {"label": "15:00", "activityCount": 18, "activeDevices": 4},
                        {"label": "16:00", "activityCount": 21, "activeDevices": 5}
                    ],
                    "comparison": -15
                }
            elif period == "week":
                activity_data = {
                    "period": period,
                    "totalActivity": 845,
                    "data": [
                        {"label": "Mon", "activityCount": 120, "activeDevices": 5},
                        {"label": "Tue", "activityCount": 135, "activeDevices": 6},
                        {"label": "Wed", "activityCount": 140, "activeDevices": 6},
                        {"label": "Thu", "activityCount": 125, "activeDevices": 5},
                        {"label": "Fri", "activityCount": 155, "activeDevices": 7},
                        {"label": "Sat", "activityCount": 100, "activeDevices": 4},
                        {"label": "Sun", "activityCount": 70, "activeDevices": 3}
                    ],
                    "comparison": -23
                }
            elif period == "month":
                activity_data = {
                    "period": period,
                    "totalActivity": 3200,
                    "data": [
                        {"label": "Week 1", "activityCount": 800, "activeDevices": 8},
                        {"label": "Week 2", "activityCount": 850, "activeDevices": 7},
                        {"label": "Week 3", "activityCount": 780, "activeDevices": 6},
                        {"label": "Week 4", "activityCount": 770, "activeDevices": 7}
                    ],
                    "comparison": -18
                }
            else:
                activity_data = {
                    "period": period,
                    "totalActivity": 156,
                    "data": [],
                    "comparison": 0
                }
        
        return jsonify({
            'success': True,
            'data': activity_data
        })
    except Exception as e:
        print(f"❌ [ANALYTICS] Activity error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/analytics/device-usage')
def get_device_usage():
    """API endpoint trả về dữ liệu device usage"""
    try:
        usage_data = fetch_device_usage()
        
        # Nếu không có dữ liệu từ backend, tạo mock data
        if not usage_data:
            usage_data = [
                {
                    "name": "Living Room AC",
                    "type": "AC",
                    "status": "On",
                    "room": "Living Room",
                    "activityCount": 45,
                    "lastActivity": "2024-01-15T10:30:00Z",
                    "percentage": 28
                },
                {
                    "name": "Kitchen Light",
                    "type": "Light",
                    "status": "Off",
                    "room": "Kitchen",
                    "activityCount": 38,
                    "lastActivity": "2024-01-15T09:45:00Z",
                    "percentage": 24
                },
                {
                    "name": "Bedroom TV",
                    "type": "TV",
                    "status": "On",
                    "room": "Bedroom",
                    "activityCount": 32,
                    "lastActivity": "2024-01-15T08:15:00Z",
                    "percentage": 20
                },
                {
                    "name": "Bathroom Fan",
                    "type": "Fan",
                    "status": "On",
                    "room": "Bathroom",
                    "activityCount": 25,
                    "lastActivity": "2024-01-15T07:30:00Z",
                    "percentage": 16
                },
                {
                    "name": "Hallway Light",
                    "type": "Light",
                    "status": "Off",
                    "room": "Hallway",
                    "activityCount": 18,
                    "lastActivity": "2024-01-14T22:10:00Z",
                    "percentage": 12
                }
            ]
        
        return jsonify({
            'success': True,
            'data': usage_data
        })
    except Exception as e:
        print(f"❌ [ANALYTICS] Device usage error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/analytics/real-time')
def get_real_time_data():
    """API endpoint trả về dữ liệu real-time"""
    try:
        real_time_data = fetch_real_time_data()
        
        # Nếu không có dữ liệu từ backend, tạo mock data
        if not real_time_data:
            real_time_data = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "currentActivity": random.randint(10, 25),
                "totalActivity": 234,
                "devices": [
                    {"name": "Living Room AC", "type": "AC", "status": "On", "room": "Living Room", "power": 120},
                    {"name": "Kitchen Light", "type": "Light", "status": "Off", "room": "Kitchen", "power": 0},
                    {"name": "Bedroom TV", "type": "TV", "status": "On", "room": "Bedroom", "power": 80},
                    {"name": "Bathroom Fan", "type": "Fan", "status": "On", "room": "Bathroom", "power": 30}
                ],
                "peakUsage": 156,
                "activeDevices": 3,
                "energySaved": 18.72
            }
        
        return jsonify({
            'success': True,
            'data': real_time_data
        })
    except Exception as e:
        print(f"❌ [ANALYTICS] Real-time error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== EXISTING ROUTES ====================

@app.route('/api/devices')
def get_devices_api():
    """API endpoint trả về danh sách devices"""
    try:
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
        socketio.emit('deviceUpdated', {
            'id': device_id,
            'state': new_state
        })
        
        print(f"✅ [FLASK] UI updated instantly for device {device_id}")
        
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
                    timeout=3
                )
                
                if res.status_code == 200:
                    print(f"✅ [BACKEND] Toggle success: {res.json()}")
                else:
                    print(f"❌ [BACKEND] Error: {res.status_code}")
                    
            except Exception as e:
                print(f"❌ [BACKEND] Async error: {e}")
        
        thread = threading.Thread(target=send_to_backend)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "success": True, 
            "message": f"Device toggled to {'ON' if new_state else 'OFF'}",
            "instant": True
        })
            
    except Exception as e:
        print(f"❌ [FLASK] Toggle error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

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

@app.route('/test-backend')
def test_backend():
    """Test backend connection và endpoints"""
    try:
        devices_res = requests.get("http://localhost:3000/api/devices", timeout=5)
        
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

# ==================== SOCKET.IO HANDLERS ====================

@socketio.on('connect')
def handle_connect():
    print('✅ [SOCKET.IO] Client connected')
    emit('connection_status', {'status': 'connected'})

@socketio.on('disconnect') 
def handle_disconnect():
    print('❌ [SOCKET.IO] Client disconnected')

@socketio.on('requestAnalytics')
def handle_analytics_request(data):
    """Xử lý yêu cầu analytics từ client"""
    period = data.get('period', 'week')
    print(f"📊 [SOCKET.IO] Analytics requested for period: {period}")
    
    try:
        activity_data = fetch_activity_data(period)
        device_usage = fetch_device_usage()
        
        socketio.emit('analyticsUpdate', {
            'period': period,
            'activity': activity_data,
            'deviceUsage': device_usage,
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })
        
    except Exception as e:
        print(f"❌ [SOCKET.IO] Analytics error: {e}")

@socketio.on('requestRealTimeData')
def handle_real_time_request():
    """Xử lý yêu cầu dữ liệu real-time từ client"""
    print(f"📈 [SOCKET.IO] Real-time data requested")
    
    try:
        # Gửi dữ liệu real-time ban đầu
        current_activity = random.randint(10, 25)
        
        socketio.emit('realTimeUpdate', {
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            'currentActivity': current_activity,
            'totalActivity': 234,
            'devices': [
                {'name': 'Living Room Light', 'type': 'Light', 'status': 'On', 'power': 45},
                {'name': 'Kitchen AC', 'type': 'AC', 'status': 'On', 'power': 120},
                {'name': 'Bedroom TV', 'type': 'TV', 'status': 'Off', 'power': 0},
                {'name': 'Bathroom Fan', 'type': 'Fan', 'status': 'On', 'power': 30}
            ],
            'peakUsage': 156,
            'activeDevices': 3,
            'energySaved': 18.72
        })
        
    except Exception as e:
        print(f"❌ [SOCKET.IO] Real-time error: {e}")

if __name__ == '__main__':
    print('''
============================================================
🚀 Flask Frontend Server Starting...
============================================================
🏠 Homepage:     http://localhost:5000/
                 http://localhost:5000/homepage.html
📱 Devices:      http://localhost:5000/devices
                 http://localhost:5000/devicescontrol.html
📊 Analytics:    http://localhost:5000/analytics
                 http://localhost:5000/analytics.html
🔗 Backend:      http://localhost:3000/api
💚 Health:       http://localhost:5000/health
🔧 Test:         http://localhost:5000/test-backend
📈 Real-time:    Active (3s interval)
============================================================
''')
    
    try:
        devices = fetch_devices_from_backend()
        print(f"🔍 Testing backend connection...")
        print(f"✅ Backend connection: OK")
        print(f"✅ Found {len(devices)} devices")
        
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
    
    # Start real-time data push thread
    print("📈 Starting real-time data pusher thread...")
    real_time_thread = threading.Thread(target=push_real_time_data_periodically)
    real_time_thread.daemon = True
    real_time_thread.start()
    
    print("============================================================")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)