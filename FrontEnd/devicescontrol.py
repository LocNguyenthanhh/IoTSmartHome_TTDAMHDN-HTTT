from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import requests
import json
import time
import threading
import random
import os

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration
BACKEND_URL = "http://localhost:3000"

# ==================== PROXY ROUTES FOR AUTH ====================

@app.route('/api/auth/register', methods=['POST'])
def register_proxy():
    """Proxy register request to backend"""
    try:
        data = request.get_json()
        print(f"📝 [FLASK-AUTH] Register proxy: {data.get('email', 'No email')}")
        
        # Forward to backend
        response = requests.post(
            f"{BACKEND_URL}/api/auth/register",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"✅ [FLASK-AUTH] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTH] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running. Please start Node.js backend on port 3000.'
        }), 503
    except Exception as e:
        print(f"❌ [FLASK-AUTH] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login_proxy():
    """Proxy login request to backend"""
    try:
        data = request.get_json()
        print(f"🔐 [FLASK-AUTH] Login proxy: {data.get('email', 'No email')}")
        
        # Forward to backend
        response = requests.post(
            f"{BACKEND_URL}/api/auth/login",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"✅ [FLASK-AUTH] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTH] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
    except Exception as e:
        print(f"❌ [FLASK-AUTH] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/auth/profile', methods=['GET'])
def profile_proxy():
    """Proxy profile request to backend"""
    try:
        # Get token from headers
        token = request.headers.get('Authorization', '')
        print(f"👤 [FLASK-AUTH] Profile proxy request")
        
        # Forward to backend
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = token
            
        response = requests.get(
            f"{BACKEND_URL}/api/auth/profile",
            headers=headers,
            timeout=10
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTH] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
    except Exception as e:
        print(f"❌ [FLASK-AUTH] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

# ==================== DEVICE PROXY ROUTES ====================

@app.route('/api/devices', methods=['GET'])
def devices_get_proxy():
    """Proxy get devices request to backend"""
    try:
        print("📡 [FLASK-DEVICES] GET devices request")
        
        # Forward to backend
        response = requests.get(
            f"{BACKEND_URL}/api/devices",
            timeout=5
        )
        
        print(f"✅ [FLASK-DEVICES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
            
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-DEVICES] Backend connection failed")
        # Return mock data if backend is down
        return jsonify([
            {
                'id': '1',
                'name': 'Living Room Light (Mock)',
                'type': 'Light',
                'status': 'On',
                'room': 'Living Room',
                'power': 45,
                'lastActivity': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                'id': '2',
                'name': 'Kitchen AC (Mock)',
                'type': 'AC',
                'status': 'Off',
                'room': 'Kitchen',
                'power': 120,
                'temperature': 24,
                'lastActivity': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                'id': '3',
                'name': 'Bedroom TV (Mock)',
                'type': 'TV',
                'status': 'Off',
                'room': 'Bedroom',
                'power': 0,
                'lastActivity': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        ])
            
    except Exception as e:
        print(f"❌ [FLASK-DEVICES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/devices', methods=['POST'])
def devices_post_proxy():
    """Proxy post devices request to backend"""
    try:
        data = request.get_json()
        print(f"➕ [FLASK-DEVICES] POST device request: {data.get('name', 'No name')}")
        
        # Forward to backend
        response = requests.post(
            f"{BACKEND_URL}/api/devices",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        print(f"✅ [FLASK-DEVICES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
            
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-DEVICES] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
            
    except Exception as e:
        print(f"❌ [FLASK-DEVICES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/devices/<device_id>', methods=['DELETE'])
def delete_device_proxy(device_id):
    """Proxy delete device request"""
    try:
        print(f"🗑️ [FLASK-DEVICES] DELETE device request: {device_id}")
        
        response = requests.delete(
            f"{BACKEND_URL}/api/devices/{device_id}",
            timeout=5
        )
        
        print(f"✅ [FLASK-DEVICES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-DEVICES] Backend connection failed")
        return jsonify({
            'success': True,
            'message': 'Device deleted (simulated - backend offline)',
            'simulated': True
        })
    except Exception as e:
        print(f"❌ [FLASK-DEVICES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

# ==================== SCHEDULES PROXY ROUTES ====================

@app.route('/api/schedules', methods=['GET'])
def schedules_get_proxy():
    """Proxy get schedules request to backend"""
    try:
        print("📅 [FLASK-SCHEDULES] GET schedules request")
        
        response = requests.get(f"{BACKEND_URL}/api/schedules", timeout=5)
        print(f"✅ [FLASK-SCHEDULES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SCHEDULES] Backend connection failed")
        # Return mock data if backend is down
        return jsonify({
            'success': True,
            'count': 2,
            'schedules': [
                {
                    'id': '1',
                    'deviceId': '1',
                    'deviceName': 'Living Room Light',
                    'deviceType': 'Light',
                    'location': 'Living Room',
                    'timeOn': '08:00',
                    'timeOff': '23:00',
                    'note': 'Auto turn on/off lights',
                    'isActive': True,
                    'createdAt': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    'updatedAt': time.strftime("%Y-%m-%dT%H:%M:%SZ")
                },
                {
                    'id': '2',
                    'deviceId': '2',
                    'deviceName': 'Kitchen AC',
                    'deviceType': 'AC',
                    'location': 'Bedroom',
                    'timeOn': '22:00',
                    'timeOff': None,
                    'note': 'Turn on before sleep',
                    'isActive': True,
                    'createdAt': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    'updatedAt': time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            ]
        })
    except Exception as e:
        print(f"❌ [FLASK-SCHEDULES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/schedules', methods=['POST'])
def schedules_post_proxy():
    """Proxy create schedule request"""
    try:
        data = request.get_json()
        print(f"📅 [FLASK-SCHEDULES] POST schedule request: {data.get('deviceName', 'No device')}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/schedules",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        print(f"✅ [FLASK-SCHEDULES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SCHEDULES] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
    except Exception as e:
        print(f"❌ [FLASK-SCHEDULES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/schedules/<schedule_id>', methods=['PUT'])
def schedules_put_proxy(schedule_id):
    """Proxy update schedule request"""
    try:
        data = request.get_json()
        print(f"📅 [FLASK-SCHEDULES] PUT schedule request: {schedule_id}")
        
        response = requests.put(
            f"{BACKEND_URL}/api/schedules/{schedule_id}",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        print(f"✅ [FLASK-SCHEDULES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SCHEDULES] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
    except Exception as e:
        print(f"❌ [FLASK-SCHEDULES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
def schedules_delete_proxy(schedule_id):
    """Proxy delete schedule request"""
    try:
        print(f"📅 [FLASK-SCHEDULES] DELETE schedule request: {schedule_id}")
        
        response = requests.delete(
            f"{BACKEND_URL}/api/schedules/{schedule_id}",
            timeout=5
        )
        
        print(f"✅ [FLASK-SCHEDULES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SCHEDULES] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
    except Exception as e:
        print(f"❌ [FLASK-SCHEDULES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/schedules/<schedule_id>/toggle', methods=['POST'])
def toggle_schedule_proxy(schedule_id):
    """Proxy toggle schedule request"""
    try:
        data = request.get_json()
        print(f"📅 [FLASK-SCHEDULES] POST toggle schedule: {schedule_id} to {data.get('isActive')}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/schedules/{schedule_id}/toggle",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        print(f"✅ [FLASK-SCHEDULES] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SCHEDULES] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

# ==================== SCHEDULE EXECUTION ====================

def check_and_execute_schedules():
    """Kiểm tra và thực thi schedules định kỳ"""
    while True:
        try:
            current_time = time.strftime("%H:%M")
            current_day = time.strftime("%A")
            print(f"⏰ [SCHEDULER] Checking schedules at {current_time}")
            
            # Lấy tất cả schedules từ backend
            try:
                response = requests.get(f"{BACKEND_URL}/api/schedules", timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    schedules = data.get('schedules', [])
                else:
                    schedules = []
                    print(f"❌ [SCHEDULER] Failed to fetch schedules: {response.status_code}")
            except:
                schedules = []
                print("❌ [SCHEDULER] Backend connection failed")
            
            # Kiểm tra từng schedule
            for schedule in schedules:
                if not schedule.get('isActive', True):
                    continue
                
                schedule_id = schedule.get('id')
                device_id = schedule.get('deviceId')
                time_on = schedule.get('timeOn')
                time_off = schedule.get('timeOff')
                repeat_days = schedule.get('repeatDays', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
                
                # Kiểm tra nếu hôm nay trong repeat days
                if current_day not in repeat_days:
                    continue
                
                # Kiểm tra time_on
                if time_on and current_time == time_on:
                    print(f"⏰ [SCHEDULER] Executing ON schedule: {schedule_id} for device {device_id}")
                    
                    # Toggle device ON
                    try:
                        # Gửi request đến backend để toggle device
                        toggle_response = requests.post(
                            f"{BACKEND_URL}/api/devices/toggle",
                            json={'deviceId': device_id, 'state': True},
                            timeout=2
                        )
                        
                        if toggle_response.status_code == 200:
                            # Broadcast qua socket
                            socketio.emit('deviceUpdated', {
                                'id': device_id,
                                'state': True
                            })
                            socketio.emit('scheduleExecuted', {
                                'scheduleId': schedule_id,
                                'deviceId': device_id,
                                'action': 'ON',
                                'time': current_time
                            })
                            print(f"✅ [SCHEDULER] Device {device_id} turned ON via schedule")
                    except Exception as e:
                        print(f"❌ [SCHEDULER] Error executing ON schedule: {e}")
                
                # Kiểm tra time_off
                if time_off and current_time == time_off:
                    print(f"⏰ [SCHEDULER] Executing OFF schedule: {schedule_id} for device {device_id}")
                    
                    # Toggle device OFF
                    try:
                        toggle_response = requests.post(
                            f"{BACKEND_URL}/api/devices/toggle",
                            json={'deviceId': device_id, 'state': False},
                            timeout=2
                        )
                        
                        if toggle_response.status_code == 200:
                            # Broadcast qua socket
                            socketio.emit('deviceUpdated', {
                                'id': device_id,
                                'state': False
                            })
                            socketio.emit('scheduleExecuted', {
                                'scheduleId': schedule_id,
                                'deviceId': device_id,
                                'action': 'OFF',
                                'time': current_time
                            })
                            print(f"✅ [SCHEDULER] Device {device_id} turned OFF via schedule")
                    except Exception as e:
                        print(f"❌ [SCHEDULER] Error executing OFF schedule: {e}")
            
            time.sleep(60)  # Kiểm tra mỗi phút
            
        except Exception as e:
            print(f"❌ [SCHEDULER] Critical error: {e}")
            time.sleep(60)

# ==================== UTILITY FUNCTIONS FOR SCHEDULES ====================

def is_time_upcoming(target_time, minutes_ahead=5):
    """Kiểm tra nếu thời gian sắp diễn ra (trong vòng X phút)"""
    if not target_time:
        return False
    
    try:
        current_hour = int(time.strftime("%H"))
        current_minute = int(time.strftime("%M"))
        
        target_hour = int(target_time.split(':')[0])
        target_minute = int(target_time.split(':')[1])
        
        # Tính số phút từ hiện tại đến target
        current_total = current_hour * 60 + current_minute
        target_total = target_hour * 60 + target_minute
        
        # Tính khoảng cách (xử lý qua ngày)
        if target_total < current_total:
            target_total += 24 * 60  # Thêm 1 ngày
        
        return 0 <= (target_total - current_total) <= minutes_ahead
    except:
        return False

def format_time_display(time_str):
    """Format 24h time to 12h display"""
    if not time_str:
        return ""
    
    try:
        hour = int(time_str.split(':')[0])
        minute = time_str.split(':')[1]
        
        if hour == 0:
            return f"12:{minute} AM"
        elif hour < 12:
            return f"{hour}:{minute} AM"
        elif hour == 12:
            return f"12:{minute} PM"
        else:
            return f"{hour-12}:{minute} PM"
    except:
        return time_str

# ==================== SCHEDULE MANAGEMENT ROUTES ====================

@app.route('/api/schedules/execute', methods=['POST'])
def execute_schedule():
    """Execute a schedule manually"""
    try:
        data = request.get_json()
        schedule_id = data.get('scheduleId')
        
        print(f"⏰ [FLASK] Manually executing schedule: {schedule_id}")
        
        # Lấy schedule info từ backend
        response = requests.get(f"{BACKEND_URL}/api/schedules/{schedule_id}", timeout=3)
        if response.status_code != 200:
            return jsonify({'success': False, 'message': 'Schedule not found'})
        
        schedule = response.json().get('schedule', {})
        device_id = schedule.get('deviceId')
        action = data.get('action', 'ON')  # 'ON' or 'OFF'
        
        # Toggle device
        new_state = action.upper() == 'ON'
        
        try:
            toggle_response = requests.post(
                f"{BACKEND_URL}/api/devices/toggle",
                json={'deviceId': device_id, 'state': new_state},
                timeout=2
            )
            
            if toggle_response.status_code == 200:
                # Broadcast qua socket
                socketio.emit('deviceUpdated', {
                    'id': device_id,
                    'state': new_state
                })
                
                return jsonify({
                    'success': True,
                    'message': f'Device turned {action} via schedule',
                    'deviceId': device_id,
                    'scheduleId': schedule_id
                })
            else:
                return jsonify({'success': False, 'message': 'Failed to toggle device'})
                
        except:
            return jsonify({'success': False, 'message': 'Backend connection failed'})
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/schedules/check', methods=['GET'])
def check_schedules():
    """Check and return upcoming schedules"""
    try:
        current_time = time.strftime("%H:%M")
        upcoming_schedules = []
        
        # Lấy schedules từ backend
        response = requests.get(f"{BACKEND_URL}/api/schedules", timeout=3)
        if response.status_code == 200:
            data = response.json()
            schedules = data.get('schedules', [])
            
            # Lọc schedules active
            for schedule in schedules:
                if schedule.get('isActive', True):
                    time_on = schedule.get('timeOn')
                    time_off = schedule.get('timeOff')
                    
                    # Kiểm tra nếu schedule sắp diễn ra (trong vòng 5 phút)
                    if time_on and is_time_upcoming(time_on, 5):
                        upcoming_schedules.append({
                            'id': schedule.get('id'),
                            'deviceId': schedule.get('deviceId'),
                            'deviceName': schedule.get('deviceName'),
                            'action': 'ON',
                            'time': time_on,
                            'timeFormatted': format_time_display(time_on)
                        })
                    
                    if time_off and is_time_upcoming(time_off, 5):
                        upcoming_schedules.append({
                            'id': schedule.get('id'),
                            'deviceId': schedule.get('deviceId'),
                            'deviceName': schedule.get('deviceName'),
                            'action': 'OFF',
                            'time': time_off,
                            'timeFormatted': format_time_display(time_off)
                        })
        
        return jsonify({
            'success': True,
            'currentTime': current_time,
            'upcomingSchedules': upcoming_schedules,
            'count': len(upcoming_schedules)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== OTHER PROXY ROUTES ====================

def fetch_from_backend(endpoint):
    """Generic function to fetch from backend"""
    try:
        response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

@app.route('/api/analytics/dashboard')
def analytics_dashboard_proxy():
    """Proxy analytics dashboard request"""
    try:
        data = fetch_from_backend('/api/analytics/dashboard')
        if data:
            return jsonify(data)
        
        # Fallback mock data
        return jsonify({
            'success': True,
            'data': {
                'summary': {'totalDevices': 12, 'activeDevices': 8},
                'activity': {'total': 156, 'comparison': -23},
                'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        })
    except Exception as e:
        print(f"❌ [FLASK] Analytics proxy error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analytics/real-time')
def analytics_realtime_proxy():
    """Proxy real-time analytics request"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/analytics/real-time", timeout=5)
        if response.status_code == 200:
            return jsonify(response.json())
        
        # Fallback mock data
        return jsonify({
            'success': True,
            'data': {
                'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'currentActivity': random.randint(10, 25),
                'totalActivity': 234,
                'activeDevices': random.randint(3, 8),
                'energySaved': round(random.uniform(18.0, 23.0), 2)
            }
        })
    except:
        return jsonify({
            'success': True,
            'data': {
                'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'currentActivity': random.randint(10, 25),
                'totalActivity': 234,
                'activeDevices': random.randint(3, 8),
                'energySaved': round(random.uniform(18.0, 23.0), 2)
            }
        })

# ==================== FRONTEND ROUTES ====================

@app.route('/')
def index():
    """Serve homepage directly at root"""
    return render_template('homepage.html')

@app.route('/homepage')
def homepage():
    """Also serve homepage for direct access"""
    return render_template('homepage.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/account')
def account():
    return render_template('account.html')

@app.route('/createaccount')
def createaccount():
    return render_template('createaccount.html')

@app.route('/devices')
def devices():
    return render_template('devicescontrol.html')

@app.route('/adddevice')
def adddevice():
    return render_template('adddevice.html')

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/schedules')
def schedules():
    return render_template('schedules.html')

@app.route('/history')
def history():
    return render_template('history.html')

# Direct HTML access
@app.route('/<page>.html')
def serve_html(page):
    allowed = ['homepage', 'login', 'account', 'createaccount', 
               'devicescontrol', 'adddevice', 'analytics', 'schedules', 'history', 'index']
    if page in allowed:
        try:
            return render_template(f'{page}.html')
        except:
            # If template not found, return simple page
            return f"""
            <!DOCTYPE html>
            <html>
            <head><title>IoT Smart Home - {page.capitalize()}</title></head>
            <body>
                <h1>IoT Smart Home - {page.capitalize()}</h1>
                <p>Page is under construction</p>
                <p><a href="/">← Back to Home</a></p>
            </body>
            </html>
            """
    return "Page not found", 404

# ==================== DEVICE CONTROL ====================

@app.route('/toggle_device', methods=['POST'])
def toggle_device():
    """Handle device toggle"""
    try:
        data = request.get_json()
        device_id = data.get('id')
        new_state = data.get('state')
        
        print(f"🔄 [FLASK] Toggle device {device_id} to {new_state}")
        
        # Send socket update
        socketio.emit('deviceUpdated', {
            'id': device_id,
            'state': new_state
        })
        
        # Try to send to backend
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/devices/toggle",
                json={'deviceId': device_id, 'state': new_state},
                timeout=2
            )
            return jsonify(response.json())
        except:
            # If backend not available, return success anyway
            return jsonify({
                'success': True,
                'message': f'Device toggled to {"ON" if new_state else "OFF"} (simulated)',
                'simulated': True
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/delete_device', methods=['POST'])
def delete_device():
    """Handle device deletion"""
    try:
        data = request.get_json()
        device_id = data.get('deviceId')
        
        print(f"🗑️ [FLASK] Delete device request: {device_id}")
        
        # Send socket update
        socketio.emit('deviceDeleted', {
            'deviceId': device_id
        })
        
        # Try to send to backend
        try:
            response = requests.delete(
                f"{BACKEND_URL}/api/devices/{device_id}",
                timeout=2
            )
            return jsonify(response.json())
        except:
            # If backend not available, return success anyway
            return jsonify({
                'success': True,
                'message': 'Device deleted (simulated)',
                'simulated': True
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== REAL-TIME FUNCTIONS ====================

def push_real_time_data():
    """Push real-time data periodically"""
    while True:
        try:
            time.sleep(3)
            
            # Try to get data from backend
            try:
                response = requests.get(f"{BACKEND_URL}/api/analytics/real-time", timeout=2)
                if response.status_code == 200:
                    data = response.json().get('data', {})
                else:
                    data = {}
            except:
                data = {}
            
            # Prepare data
            real_time_data = {
                'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'currentActivity': data.get('currentActivity', random.randint(10, 25)),
                'totalActivity': data.get('totalActivity', 234),
                'activeDevices': data.get('activeDevices', random.randint(3, 8)),
                'energySaved': data.get('energySaved', round(random.uniform(18.0, 23.0), 2))
            }
            
            # Emit via socket
            socketio.emit('realTimeUpdate', real_time_data)
            
        except Exception as e:
            print(f"❌ [FLASK] Real-time error: {e}")
            time.sleep(5)

# ==================== SOCKET.IO ====================

@socketio.on('connect')
def handle_connect():
    print('✅ [SOCKET.IO] Client connected')
    emit('connection_status', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print('❌ [SOCKET.IO] Client disconnected')

@socketio.on('deviceAdded')
def handle_device_added(data):
    print(f'➕ [SOCKET.IO] Device added event: {data}')
    # Broadcast to all clients
    emit('deviceAdded', data, broadcast=True)

@socketio.on('deviceDeleted')
def handle_device_deleted(data):
    print(f'🗑️ [SOCKET.IO] Device deleted event: {data}')
    # Broadcast to all clients
    emit('deviceDeleted', data, broadcast=True)

@socketio.on('deviceUpdated')
def handle_device_updated(data):
    print(f'🔄 [SOCKET.IO] Device updated event: {data}')
    # Broadcast to all clients
    emit('deviceUpdated', data, broadcast=True)

@socketio.on('scheduleAdded')
def handle_schedule_added(data):
    print(f'📅 [SOCKET.IO] Schedule added event: {data}')
    # Broadcast to all clients
    emit('scheduleAdded', data, broadcast=True)

@socketio.on('scheduleUpdated')
def handle_schedule_updated(data):
    print(f'📅 [SOCKET.IO] Schedule updated event: {data}')
    # Broadcast to all clients
    emit('scheduleUpdated', data, broadcast=True)

@socketio.on('scheduleDeleted')
def handle_schedule_deleted(data):
    print(f'📅 [SOCKET.IO] Schedule deleted event: {data}')
    # Broadcast to all clients
    emit('scheduleDeleted', data, broadcast=True)

@socketio.on('scheduleExecuted')
def handle_schedule_executed(data):
    print(f'⏰ [SOCKET.IO] Schedule executed event: {data}')
    # Broadcast to all clients
    emit('scheduleExecuted', data, broadcast=True)

@socketio.on('requestRealTimeData')
def handle_request_real_time_data():
    print('📡 [SOCKET.IO] Real-time data requested')
    # Send real-time data
    real_time_data = {
        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        'currentActivity': random.randint(10, 25),
        'totalActivity': 234,
        'activeDevices': random.randint(3, 8),
        'energySaved': round(random.uniform(18.0, 23.0), 2)
    }
    emit('realTimeUpdate', real_time_data)

# ==================== HEALTH CHECK ====================

@app.route('/health')
def health_check():
    try:
        # Check backend
        backend_status = "unknown"
        try:
            response = requests.get(f"{BACKEND_URL}/health", timeout=3)
            backend_status = "connected" if response.status_code == 200 else "disconnected"
        except:
            backend_status = "disconnected"
        
        return jsonify({
            'status': 'healthy',
            'service': 'Flask Frontend',
            'port': 5000,
            'backend': backend_status,
            'backend_url': BACKEND_URL,
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })
    except:
        return jsonify({'status': 'degraded', 'service': 'Flask Frontend'}), 500

@app.route('/test-backend')
def test_backend():
    """Test backend connection"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=3)
        return jsonify({
            'backend_status': 'connected' if response.status_code == 200 else 'disconnected',
            'status_code': response.status_code,
            'response': response.json() if response.status_code == 200 else {}
        })
    except:
        return jsonify({'backend_status': 'disconnected'})

@app.route('/debug/users')
def debug_users():
    """Debug endpoint to check backend users"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/auth/users", timeout=5)
        return jsonify(response.json())
    except:
        return jsonify({'success': False, 'message': 'Backend not available'})

@app.route('/debug/schedules')
def debug_schedules():
    """Debug endpoint to check backend schedules"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/schedules", timeout=5)
        return jsonify(response.json())
    except:
        return jsonify({'success': False, 'message': 'Backend not available'})

@app.route('/debug/devices')
def debug_devices():
    """Debug endpoint to check backend devices"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/devices", timeout=5)
        return jsonify(response.json())
    except:
        return jsonify({'success': False, 'message': 'Backend not available'})

# ==================== MAIN ====================

if __name__ == '__main__':
    print('''
============================================================
🚀 Flask Frontend Server Starting...
============================================================
🏠 Homepage:     http://localhost:5000/
🔐 Login:        http://localhost:5000/login
📝 Create Acc:   http://localhost:5000/createaccount
👤 Account:      http://localhost:5000/account
📱 Devices:      http://localhost:5000/devices
➕ Add Device:   http://localhost:5000/adddevice
📅 Schedules:    http://localhost:5000/schedules
📊 Analytics:    http://localhost:5000/analytics
🔗 Backend:      http://localhost:3000
💚 Health:       http://localhost:5000/health
⏰ Scheduler:    http://localhost:5000/api/schedules/check
🐞 Debug Users:  http://localhost:5000/debug/users
🐞 Debug Schedules: http://localhost:5000/debug/schedules
🐞 Debug Devices: http://localhost:5000/debug/devices
📈 Real-time:    Active (3s interval)
⏰ Auto-schedule: Active (1m interval)
============================================================
''')
    
    # Test backend connection
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ Backend connection: OK")
            backend_data = response.json()
            print(f"📊 Backend stats: {backend_data.get('services', {})}")
        else:
            print(f"⚠️ Backend response: {response.status_code}")
    except:
        print(f"❌ Backend connection failed - Make sure Node.js backend is running on port 3000")
    
    # Start real-time thread
    real_time_thread = threading.Thread(target=push_real_time_data, daemon=True)
    real_time_thread.start()
    
    # Start schedule execution thread
    schedule_thread = threading.Thread(target=check_and_execute_schedules, daemon=True)
    schedule_thread.start()
    
    print("⏰ Schedule executor: ACTIVE (checking every minute)")
    print("============================================================")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)