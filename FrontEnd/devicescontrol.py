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

# ==================== PROXY ROUTES FOR SENSORS AND AUTOMATION ====================

@app.route('/api/sensors', methods=['GET'])
def sensors_get_proxy():
    """Proxy get sensors request to backend"""
    try:
        print("📡 [FLASK-SENSORS] GET sensors request")
        
        response = requests.get(
            f"{BACKEND_URL}/api/sensors",
            timeout=5
        )
        
        print(f"✅ [FLASK-SENSORS] Backend response: {response.status_code}")
        return jsonify(response.json()), response.status_code
            
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SENSORS] Backend connection failed")
        # Return mock sensor data
        return jsonify({
            'success': True,
            'count': 1,
            'sensors': [
                {
                    'id': 'sensor_light_1',
                    'name': 'Living Room Light Sensor (Mock)',
                    'type': 'Sensor',
                    'subtype': 'Light',
                    'status': 'Active',
                    'room': 'Living Room',
                    'luxValue': 350,
                    'threshold': 200,
                    'updateInterval': 10,
                    'linkedDevice': '1',
                    'lastUpdate': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    'linkedDeviceInfo': {
                        'id': '1',
                        'name': 'Living Room Light',
                        'type': 'Light',
                        'status': 'On'
                    }
                }
            ]
        })
            
    except Exception as e:
        print(f"❌ [FLASK-SENSORS] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

@app.route('/api/sensors/<sensor_id>/logs', methods=['GET'])
def sensor_logs_proxy(sensor_id):
    """Proxy get sensor logs request"""
    try:
        print(f"📊 [FLASK-SENSORS] GET logs for sensor: {sensor_id}")
        
        limit = request.args.get('limit', 50)
        
        response = requests.get(
            f"{BACKEND_URL}/api/sensors/{sensor_id}/logs?limit={limit}",
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SENSORS] Backend connection failed")
        # Return mock logs
        return jsonify({
            'success': True,
            'count': 5,
            'logs': [
                {
                    'id': 'log_1',
                    'sensorId': sensor_id,
                    'luxValue': 350,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    'action': 'none',
                    'deviceState': 'On'
                },
                {
                    'id': 'log_2',
                    'sensorId': sensor_id,
                    'luxValue': 180,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 10)),
                    'action': 'turn_on',
                    'deviceState': 'On'
                },
                {
                    'id': 'log_3',
                    'sensorId': sensor_id,
                    'luxValue': 520,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 20)),
                    'action': 'turn_off',
                    'deviceState': 'Off'
                }
            ]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/sensors/<sensor_id>', methods=['PUT'])
def update_sensor_proxy(sensor_id):
    """Proxy update sensor request"""
    try:
        data = request.get_json()
        print(f"⚙️ [FLASK-SENSORS] Update sensor: {sensor_id}")
        
        response = requests.put(
            f"{BACKEND_URL}/api/sensors/{sensor_id}",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SENSORS] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/sensors/data', methods=['POST'])
def sensor_data_proxy():
    """Proxy submit sensor data request"""
    try:
        data = request.get_json()
        print(f"📊 [FLASK-SENSORS] Submit sensor data: {data.get('sensorId')}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/sensors/data",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-SENSORS] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== AUTOMATION PROXY ROUTES ====================

@app.route('/api/automation/rules', methods=['GET'])
def automation_rules_proxy():
    """Proxy get automation rules request"""
    try:
        print("🤖 [FLASK-AUTOMATION] GET automation rules")
        
        response = requests.get(
            f"{BACKEND_URL}/api/automation/rules",
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTOMATION] Backend connection failed")
        # Return mock automation rules
        return jsonify({
            'success': True,
            'count': 2,
            'rules': [
                {
                    'id': 'rule_1',
                    'name': 'Tự động bật/tắt đèn theo ánh sáng (Mock)',
                    'description': 'Tự động điều chỉnh đèn dựa trên cảm biến ánh sáng',
                    'sensorId': 'sensor_light_1',
                    'deviceId': '1',
                    'conditions': [
                        {
                            'type': 'lux',
                            'operator': '<',
                            'value': 200,
                            'action': 'turn_on',
                            'brightness': 80
                        },
                        {
                            'type': 'lux',
                            'operator': '>',
                            'value': 500,
                            'action': 'turn_off'
                        }
                    ],
                    'isActive': True,
                    'createdAt': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    'updatedAt': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    'sensorInfo': {
                        'id': 'sensor_light_1',
                        'name': 'Living Room Light Sensor',
                        'room': 'Living Room',
                        'currentLux': 350
                    },
                    'deviceInfo': {
                        'id': '1',
                        'name': 'Living Room Light',
                        'type': 'Light',
                        'status': 'On',
                        'mode': 'auto'
                    }
                }
            ]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/automation/rules', methods=['POST'])
def create_automation_rule_proxy():
    """Proxy create automation rule request"""
    try:
        data = request.get_json()
        print(f"🤖 [FLASK-AUTOMATION] Create automation rule: {data.get('name')}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/automation/rules",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTOMATION] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/automation/rules/<rule_id>', methods=['PUT'])
def update_automation_rule_proxy(rule_id):
    """Proxy update automation rule request"""
    try:
        data = request.get_json()
        print(f"🤖 [FLASK-AUTOMATION] Update automation rule: {rule_id}")
        
        response = requests.put(
            f"{BACKEND_URL}/api/automation/rules/{rule_id}",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTOMATION] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/automation/rules/<rule_id>', methods=['DELETE'])
def delete_automation_rule_proxy(rule_id):
    """Proxy delete automation rule request"""
    try:
        print(f"🤖 [FLASK-AUTOMATION] Delete automation rule: {rule_id}")
        
        response = requests.delete(
            f"{BACKEND_URL}/api/automation/rules/{rule_id}",
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTOMATION] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/automation/rules/<rule_id>/toggle', methods=['POST'])
def toggle_automation_rule_proxy(rule_id):
    """Proxy toggle automation rule request"""
    try:
        data = request.get_json()
        print(f"🤖 [FLASK-AUTOMATION] Toggle automation rule: {rule_id}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/automation/rules/{rule_id}/toggle",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTOMATION] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/automation/logs', methods=['GET'])
def automation_logs_proxy():
    """Proxy get automation logs request"""
    try:
        print("📝 [FLASK-AUTOMATION] GET automation logs")
        
        limit = request.args.get('limit', 100)
        
        response = requests.get(
            f"{BACKEND_URL}/api/automation/logs?limit={limit}",
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-AUTOMATION] Backend connection failed")
        # Return mock logs
        return jsonify({
            'success': True,
            'count': 3,
            'logs': [
                {
                    'id': 'auto_log_1',
                    'ruleId': 'rule_1',
                    'deviceId': '1',
                    'deviceName': 'Living Room Light',
                    'action': 'turn_on',
                    'luxValue': 180,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 300))
                },
                {
                    'id': 'auto_log_2',
                    'ruleId': 'rule_1',
                    'deviceId': '1',
                    'deviceName': 'Living Room Light',
                    'action': 'turn_off',
                    'luxValue': 520,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 600))
                },
                {
                    'id': 'auto_log_3',
                    'ruleId': 'rule_2',
                    'deviceId': '1',
                    'deviceName': 'Living Room Light',
                    'action': 'adjust_brightness',
                    'luxValue': 350,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 900))
                }
            ]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== LIGHT CONTROL PROXY ROUTES ====================

@app.route('/api/lights/<light_id>/brightness', methods=['POST'])
def light_brightness_proxy(light_id):
    """Proxy update light brightness request"""
    try:
        data = request.get_json()
        print(f"💡 [FLASK-LIGHTS] Update brightness for light: {light_id}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/lights/{light_id}/brightness",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-LIGHTS] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lights/<light_id>/mode', methods=['POST'])
def light_mode_proxy(light_id):
    """Proxy change light mode request"""
    try:
        data = request.get_json()
        print(f"💡 [FLASK-LIGHTS] Change mode for light: {light_id}")
        
        response = requests.post(
            f"{BACKEND_URL}/api/lights/{light_id}/mode",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-LIGHTS] Backend connection failed")
        return jsonify({
            'success': False,
            'message': 'Backend server is not running'
        }), 503
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lights/<light_id>/sensor-data', methods=['GET'])
def light_sensor_data_proxy(light_id):
    """Proxy get light sensor data request"""
    try:
        print(f"💡📊 [FLASK-LIGHTS] Get sensor data for light: {light_id}")
        
        limit = request.args.get('limit', 50)
        
        response = requests.get(
            f"{BACKEND_URL}/api/lights/{light_id}/sensor-data?limit={limit}",
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-LIGHTS] Backend connection failed")
        # Return mock sensor data
        return jsonify({
            'success': True,
            'lightId': light_id,
            'sensor': {
                'id': 'sensor_light_1',
                'name': 'Living Room Light Sensor',
                'currentLux': 350,
                'threshold': 200,
                'lastUpdate': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            'logs': [
                {
                    'id': 'log_1',
                    'sensorId': 'sensor_light_1',
                    'luxValue': 350,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    'action': 'none',
                    'deviceState': 'On'
                },
                {
                    'id': 'log_2',
                    'sensorId': 'sensor_light_1',
                    'luxValue': 180,
                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 10)),
                    'action': 'turn_on',
                    'deviceState': 'On'
                }
            ],
            'automationRules': [
                {
                    'id': 'rule_1',
                    'name': 'Tự động bật/tắt đèn',
                    'isActive': True
                }
            ],
            'currentBrightness': 75
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== ANALYTICS PROXY ROUTES ====================

@app.route('/api/analytics', methods=['GET'])
def analytics_proxy():
    """Proxy get analytics data"""
    try:
        print("📊 [FLASK-ANALYTICS] GET analytics data")
        
        response = requests.get(
            f"{BACKEND_URL}/api/analytics",
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-ANALYTICS] Backend connection failed, returning mock data")
        
        # Return mock analytics data
        current_time = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        one_day_ago = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 86400))
        one_week_ago = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 604800))
        
        return jsonify({
            'success': True,
            'analytics': {
                'powerConsumption': {
                    'today': 15.6,
                    'yesterday': 18.2,
                    'thisWeek': 124.8,
                    'lastWeek': 138.5,
                    'trend': -10  # percentage change
                },
                'deviceUsage': [
                    {'device': 'Living Room Light', 'usage': 12.5},
                    {'device': 'Kitchen AC', 'usage': 8.3},
                    {'device': 'Bedroom TV', 'usage': 4.7}
                ],
                'activeHours': {
                    'morning': 4.2,
                    'afternoon': 6.8,
                    'evening': 8.5,
                    'night': 2.1
                },
                'costSavings': {
                    'monthly': 45.30,
                    'quarterly': 135.90,
                    'yearly': 543.60
                },
                'environmentalImpact': {
                    'co2Saved': 125.6,  # kg
                    'treesEquivalent': 2.8
                },
                'automationStats': {
                    'rulesActive': 3,
                    'rulesExecuted': 124,
                    'energySaved': 28.5  # kWh
                }
            },
            'charts': {
                'dailyUsage': {
                    'labels': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    'data': [15.2, 16.8, 14.5, 17.2, 18.6, 20.1, 19.8]
                },
                'hourlyUsage': {
                    'labels': ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    'data': [5.2, 4.8, 8.6, 12.4, 15.8, 14.2]
                },
                'deviceDistribution': {
                    'labels': ['Lights', 'AC', 'TV', 'Other'],
                    'data': [45, 25, 15, 15]
                }
            },
            'timeRange': {
                'start': one_week_ago,
                'end': current_time
            }
        }), 200
        
    except Exception as e:
        print(f"❌ [FLASK-ANALYTICS] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Analytics error: {str(e)}'
        }), 500

@app.route('/api/analytics/power', methods=['GET'])
def analytics_power_proxy():
    """Proxy get power consumption analytics"""
    try:
        print("⚡ [FLASK-ANALYTICS] GET power consumption data")
        
        period = request.args.get('period', 'day')  # day, week, month, year
        
        response = requests.get(
            f"{BACKEND_URL}/api/analytics/power?period={period}",
            timeout=5
        )
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-ANALYTICS] Backend connection failed, returning mock power data")
        
        # Generate mock power data based on period
        period = request.args.get('period', 'day')
        now = time.time()
        
        if period == 'day':
            labels = [f"{h:02d}:00" for h in range(0, 24, 2)]
            data = [random.uniform(0.5, 2.5) for _ in range(12)]
        elif period == 'week':
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            data = [random.uniform(10, 25) for _ in range(7)]
        elif period == 'month':
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
            data = [random.uniform(40, 100) for _ in range(4)]
        else:  # year
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            data = [random.uniform(120, 400) for _ in range(12)]
        
        return jsonify({
            'success': True,
            'period': period,
            'totalConsumption': sum(data),
            'averageConsumption': sum(data) / len(data),
            'peakConsumption': max(data),
            'offPeakConsumption': min(data),
            'chartData': {
                'labels': labels,
                'data': data
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/analytics/devices', methods=['GET'])
def analytics_devices_proxy():
    """Proxy get device usage analytics"""
    try:
        print("📱 [FLASK-ANALYTICS] GET device usage data")
        
        device_id = request.args.get('deviceId')
        
        url = f"{BACKEND_URL}/api/analytics/devices"
        if device_id:
            url += f"?deviceId={device_id}"
        
        response = requests.get(url, timeout=5)
        
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-ANALYTICS] Backend connection failed, returning mock device data")
        
        # Return mock device analytics
        return jsonify({
            'success': True,
            'devices': [
                {
                    'id': '1',
                    'name': 'Living Room Light',
                    'type': 'Light',
                    'totalUsage': 12.5,  # hours
                    'powerConsumption': 56.25,  # kWh
                    'avgDailyUsage': 1.8,  # hours
                    'onCount': 42,
                    'lastUsed': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 3600))
                },
                {
                    'id': '2',
                    'name': 'Kitchen AC',
                    'type': 'AC',
                    'totalUsage': 8.3,
                    'powerConsumption': 99.6,
                    'avgDailyUsage': 1.2,
                    'onCount': 28,
                    'lastUsed': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 7200))
                },
                {
                    'id': '3',
                    'name': 'Bedroom TV',
                    'type': 'TV',
                    'totalUsage': 4.7,
                    'powerConsumption': 14.1,
                    'avgDailyUsage': 0.7,
                    'onCount': 15,
                    'lastUsed': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 14400))
                }
            ],
            'summary': {
                'totalDevices': 3,
                'totalUsage': 25.5,
                'totalPower': 169.95,
                'avgUsagePerDevice': 8.5
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== UPDATED DEVICE ROUTES ====================

@app.route('/api/devices', methods=['GET'])
def devices_get_proxy():
    """Proxy get devices request to backend (updated for light sensors)"""
    try:
        print("📡 [FLASK-DEVICES] GET devices request")
        
        response = requests.get(
            f"{BACKEND_URL}/api/devices",
            timeout=5
        )
        
        print(f"✅ [FLASK-DEVICES] Backend response: {response.status_code}")
        
        # If backend returns data, return it
        if response.status_code == 200:
            devices_data = response.json()
            return jsonify(devices_data), response.status_code
        
        # Fallback to mock data with light sensors
        return jsonify([
            {
                'id': '1',
                'name': 'Living Room Light',
                'type': 'Light',
                'subtype': 'LED',
                'status': 'On',
                'room': 'Living Room',
                'power': 45,
                'brightness': 75,
                'mode': 'auto',
                'sensorId': 'sensor_light_1',
                'sensorInfo': {
                    'id': 'sensor_light_1',
                    'name': 'Living Room Light Sensor',
                    'luxValue': 350,
                    'threshold': 200
                },
                'lastActivity': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                'id': '2',
                'name': 'Kitchen AC',
                'type': 'AC',
                'status': 'On',
                'room': 'Kitchen',
                'power': 120,
                'temperature': 24,
                'lastActivity': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                'id': '3',
                'name': 'Bedroom TV',
                'type': 'TV',
                'status': 'Off',
                'room': 'Bedroom',
                'power': 0,
                'lastActivity': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            {
                'id': 'sensor_light_1',
                'name': 'Living Room Light Sensor',
                'type': 'Sensor',
                'subtype': 'Light',
                'status': 'Active',
                'room': 'Living Room',
                'luxValue': 350,
                'threshold': 200,
                'updateInterval': 10,
                'linkedDevice': '1',
                'lastUpdate': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        ])
            
    except requests.exceptions.ConnectionError:
        print("❌ [FLASK-DEVICES] Backend connection failed")
        # Return mock data with light sensors
        return jsonify([
            {
                'id': '1',
                'name': 'Living Room Light (Mock)',
                'type': 'Light',
                'subtype': 'LED',
                'status': 'On',
                'room': 'Living Room',
                'power': 45,
                'brightness': 75,
                'mode': 'auto',
                'sensorId': 'sensor_light_1',
                'sensorInfo': {
                    'id': 'sensor_light_1',
                    'name': 'Living Room Light Sensor',
                    'luxValue': 350,
                    'threshold': 200
                },
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
            },
            {
                'id': 'sensor_light_1',
                'name': 'Living Room Light Sensor (Mock)',
                'type': 'Sensor',
                'subtype': 'Light',
                'status': 'Active',
                'room': 'Living Room',
                'luxValue': 350,
                'threshold': 200,
                'updateInterval': 10,
                'linkedDevice': '1',
                'lastUpdate': time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        ])
            
    except Exception as e:
        print(f"❌ [FLASK-DEVICES] Error: {e}")
        return jsonify({
            'success': False,
            'message': f'Proxy error: {str(e)}'
        }), 500

# ==================== UPDATED DEVICE CONTROL ====================

@app.route('/toggle_device', methods=['POST'])
def toggle_device():
    """Handle device toggle (updated for light brightness)"""
    try:
        data = request.get_json()
        device_id = data.get('id')
        new_state = data.get('state')
        brightness = data.get('brightness')
        
        print(f"🔄 [FLASK] Toggle device {device_id} to {new_state}" + 
              (f", brightness: {brightness}%" if brightness is not None else ""))
        
        # Send socket update
        socketio.emit('deviceUpdated', {
            'id': device_id,
            'state': new_state,
            'brightness': brightness
        })
        
        # Try to send to backend
        try:
            toggle_data = {'deviceId': device_id, 'state': new_state}
            if brightness is not None:
                toggle_data['brightness'] = brightness
                
            response = requests.post(
                f"{BACKEND_URL}/api/devices/toggle",
                json=toggle_data,
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

# ==================== SOCKET.IO UPDATES ====================

@socketio.on('updateLightBrightness')
def handle_update_light_brightness(data):
    print(f'💡 [SOCKET.IO] Update light brightness: {data}')
    
    # Broadcast to all clients
    emit('deviceUpdated', {
        'id': data.get('deviceId'),
        'brightness': data.get('brightness'),
        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }, broadcast=True)
    
    # Try to update backend
    try:
        requests.post(
            f"{BACKEND_URL}/api/lights/{data.get('deviceId')}/brightness",
            json={'brightness': data.get('brightness')},
            timeout=2
        )
    except:
        pass

@socketio.on('changeLightMode')
def handle_change_light_mode(data):
    print(f'💡 [SOCKET.IO] Change light mode: {data}')
    
    # Broadcast to all clients
    emit('deviceUpdated', {
        'id': data.get('deviceId'),
        'mode': data.get('mode'),
        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }, broadcast=True)
    
    # Try to update backend
    try:
        requests.post(
            f"{BACKEND_URL}/api/lights/{data.get('deviceId')}/mode",
            json={'mode': data.get('mode')},
            timeout=2
        )
    except:
        pass

@socketio.on('sensorData')
def handle_sensor_data(data):
    print(f'📊 [SOCKET.IO] Sensor data: {data}')
    
    # Broadcast to all clients
    emit('sensorDataUpdate', {
        'sensorId': data.get('sensorId'),
        'luxValue': data.get('luxValue'),
        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }, broadcast=True)
    
    # Try to update backend
    try:
        requests.post(
            f"{BACKEND_URL}/api/sensors/data",
            json=data,
            timeout=2
        )
    except:
        pass

@socketio.on('updateSensor')
def handle_update_sensor(data):
    print(f'⚙️ [SOCKET.IO] Update sensor: {data}')
    
    # Broadcast to all clients
    emit('sensorUpdated', data, broadcast=True)
    
    # Try to update backend
    try:
        requests.put(
            f"{BACKEND_URL}/api/sensors/{data.get('sensorId')}",
            json={'updates': data.get('updates')},
            timeout=2
        )
    except:
        pass

@socketio.on('createAutomationRule')
def handle_create_automation_rule(data):
    print(f'🤖 [SOCKET.IO] Create automation rule: {data}')
    
    # Broadcast to all clients
    emit('automationRuleCreated', data, broadcast=True)
    
    # Try to update backend
    try:
        requests.post(
            f"{BACKEND_URL}/api/automation/rules",
            json=data,
            timeout=2
        )
    except:
        pass

@socketio.on('updateAutomationRule')
def handle_update_automation_rule(data):
    print(f'🤖 [SOCKET.IO] Update automation rule: {data}')
    
    # Broadcast to all clients
    emit('automationRuleUpdated', data, broadcast=True)
    
    # Try to update backend
    try:
        requests.put(
            f"{BACKEND_URL}/api/automation/rules/{data.get('id')}",
            json={'updates': data.get('updates')},
            timeout=2
        )
    except:
        pass

@socketio.on('deleteAutomationRule')
def handle_delete_automation_rule(data):
    print(f'🤖 [SOCKET.IO] Delete automation rule: {data}')
    
    # Broadcast to all clients
    emit('automationRuleDeleted', data, broadcast=True)
    
    # Try to update backend
    try:
        requests.delete(
            f"{BACKEND_URL}/api/automation/rules/{data.get('ruleId')}",
            timeout=2
        )
    except:
        pass

@socketio.on('toggleAutomationRule')
def handle_toggle_automation_rule(data):
    print(f'🤖 [SOCKET.IO] Toggle automation rule: {data}')
    
    # Broadcast to all clients
    emit('automationRuleUpdated', data, broadcast=True)
    
    # Try to update backend
    try:
        requests.post(
            f"{BACKEND_URL}/api/automation/rules/{data.get('ruleId')}/toggle",
            json={'isActive': data.get('isActive')},
            timeout=2
        )
    except:
        pass

@socketio.on('requestAnalytics')
def handle_request_analytics(data):
    """Handle real-time analytics requests"""
    print(f'📊 [SOCKET.IO] Analytics request: {data}')
    
    period = data.get('period', 'day')
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/analytics/power?period={period}", timeout=2)
        if response.status_code == 200:
            analytics_data = response.json()
            emit('analyticsData', analytics_data)
    except:
        # Return mock data if backend unavailable
        mock_data = {
            'success': True,
            'period': period,
            'totalConsumption': random.uniform(10, 50),
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        emit('analyticsData', mock_data)

# ==================== NEW FRONTEND ROUTES ====================

@app.route('/automation')
def automation():
    return render_template('automation.html')

@app.route('/sensors')
def sensors():
    return render_template('sensors.html')

@app.route('/light-control')
def light_control():
    return render_template('light-control.html')

@app.route('/light-control.html')
def light_control_html():
    return render_template('light-control.html')

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/schedules')
def schedules():
    return render_template('schedules.html')

# ==================== BASIC ROUTES ====================

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/createaccount')
def createaccount():
    return render_template('createaccount.html')

@app.route('/account')
def account():
    return render_template('account.html')

@app.route('/devices')
def devices():
    return render_template('devicescontrol.html')

@app.route('/adddevice')
def adddevice():
    return render_template('adddevice.html')

# ==================== SENSOR SIMULATION THREAD ====================

def simulate_light_sensors():
    """Mô phỏng dữ liệu cảm biến ánh sáng"""
    while True:
        try:
            time.sleep(10)  # Cập nhật mỗi 10 giây
            
            # Lấy dữ liệu sensor từ backend (hoặc dùng mock)
            try:
                response = requests.get(f"{BACKEND_URL}/api/sensors", timeout=3)
                if response.status_code == 200:
                    sensors_data = response.json().get('sensors', [])
                else:
                    sensors_data = []
            except:
                sensors_data = []
            
            # Nếu không có sensor, tạo mock data
            if not sensors_data:
                sensors_data = [
                    {
                        'id': 'sensor_light_1',
                        'name': 'Living Room Light Sensor',
                        'room': 'Living Room',
                        'luxValue': 350,
                        'threshold': 200,
                        'linkedDevice': '1'
                    }
                ]
            
            # Cập nhật giá trị ánh sáng
            for sensor in sensors_data:
                if sensor.get('subtype') == 'Light' or 'luxValue' in sensor:
                    # Tính toán giá trị ánh sáng dựa trên thời gian
                    hour = time.localtime().tm_hour
                    base_lux = 300
                    
                    if hour >= 6 and hour < 18:
                        base_lux = 300 + random.randint(0, 700)
                    elif hour >= 18 and hour < 20:
                        base_lux = 100 + random.randint(0, 200)
                    else:
                        base_lux = 10 + random.randint(0, 90)
                    
                    # Thêm nhiễu
                    lux_value = max(0, base_lux + random.randint(-50, 50))
                    
                    # Gửi dữ liệu sensor
                    sensor_data = {
                        'sensorId': sensor['id'],
                        'luxValue': lux_value
                    }
                    
                    # Broadcast qua socket
                    socketio.emit('sensorDataUpdate', {
                        'sensorId': sensor['id'],
                        'luxValue': lux_value,
                        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    })
                    
                    # Gửi đến backend
                    try:
                        requests.post(
                            f"{BACKEND_URL}/api/sensors/data",
                            json=sensor_data,
                            timeout=2
                        )
                    except:
                        pass
                        
        except Exception as e:
            print(f"❌ [SENSOR SIM] Error: {e}")
            time.sleep(30)

# ==================== REAL-TIME DATA THREAD ====================

def push_real_time_data():
    """Đẩy dữ liệu real-time qua Socket.IO"""
    while True:
        try:
            time.sleep(3)  # Cập nhật mỗi 3 giây
            
            # Cập nhật trạng thái thiết bị
            try:
                response = requests.get(f"{BACKEND_URL}/api/devices", timeout=3)
                if response.status_code == 200:
                    devices = response.json()
                    
                    # Gửi dữ liệu real-time cho từng thiết bị
                    for device in devices:
                        if isinstance(device, dict) and 'id' in device:
                            # Thêm thời gian cập nhật
                            device_data = {
                                'id': device['id'],
                                'status': device.get('status', 'Off'),
                                'lastActivity': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                                'timestamp': time.time()
                            }
                            
                            # Thêm dữ liệu đặc biệt cho đèn
                            if device.get('type') == 'Light':
                                device_data.update({
                                    'brightness': device.get('brightness', 50),
                                    'mode': device.get('mode', 'manual'),
                                    'sensorData': device.get('sensorInfo', {})
                                })
                            
                            socketio.emit('deviceDataUpdate', device_data)
            except:
                pass
                
        except Exception as e:
            print(f"❌ [REAL-TIME] Error: {e}")
            time.sleep(10)

# ==================== SCHEDULE EXECUTION ====================

def check_and_execute_schedules():
    """Kiểm tra và thực thi lịch trình tự động"""
    while True:
        try:
            time.sleep(60)  # Kiểm tra mỗi phút
            
            current_time = time.strftime("%H:%M")
            current_hour = time.localtime().tm_hour
            current_minute = time.localtime().tm_min
            current_day = time.localtime().tm_wday  # 0=Monday, 6=Sunday
            
            print(f"⏰ [SCHEDULER] Checking schedules at {current_time}")
            
            # Lấy lịch trình từ backend
            try:
                response = requests.get(f"{BACKEND_URL}/api/schedules", timeout=3)
                if response.status_code == 200:
                    schedules = response.json()
                    
                    for schedule in schedules:
                        if isinstance(schedule, dict) and schedule.get('isActive'):
                            # Kiểm tra thời gian
                            schedule_time = schedule.get('time', '00:00')
                            days = schedule.get('days', [])
                            action = schedule.get('action')
                            device_id = schedule.get('deviceId')
                            
                            # Kiểm tra ngày
                            if str(current_day) in days or days == [] or days == ['*']:
                                # Kiểm tra thời gian (cho phép sai số 1 phút)
                                if schedule_time[:5] == current_time[:5]:
                                    print(f"⏰ [SCHEDULER] Executing schedule: {schedule.get('name')}")
                                    
                                    # Thực thi hành động
                                    if action == 'turn_on':
                                        try:
                                            requests.post(
                                                f"{BACKEND_URL}/api/devices/toggle",
                                                json={'deviceId': device_id, 'state': True},
                                                timeout=2
                                            )
                                            socketio.emit('deviceUpdated', {
                                                'id': device_id,
                                                'state': True,
                                                'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
                                            })
                                            print(f"✅ [SCHEDULER] Turned ON device {device_id}")
                                        except:
                                            pass
                                            
                                    elif action == 'turn_off':
                                        try:
                                            requests.post(
                                                f"{BACKEND_URL}/api/devices/toggle",
                                                json={'deviceId': device_id, 'state': False},
                                                timeout=2
                                            )
                                            socketio.emit('deviceUpdated', {
                                                'id': device_id,
                                                'state': False,
                                                'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
                                            })
                                            print(f"✅ [SCHEDULER] Turned OFF device {device_id}")
                                        except:
                                            pass
                                            
                                    elif action == 'toggle':
                                        try:
                                            response = requests.get(f"{BACKEND_URL}/api/devices/{device_id}", timeout=2)
                                            if response.status_code == 200:
                                                device = response.json()
                                                current_state = device.get('status') in ['On', 'ON', True]
                                                new_state = not current_state
                                                
                                                requests.post(
                                                    f"{BACKEND_URL}/api/devices/toggle",
                                                    json={'deviceId': device_id, 'state': new_state},
                                                    timeout=2
                                                )
                                                socketio.emit('deviceUpdated', {
                                                    'id': device_id,
                                                    'state': new_state,
                                                    'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
                                                })
                                                print(f"✅ [SCHEDULER] Toggled device {device_id} to {'ON' if new_state else 'OFF'}")
                                        except:
                                            pass
            except:
                # Nếu không kết nối được backend, sử dụng lịch trình mẫu
                execute_sample_schedules(current_time, current_hour, current_minute, current_day)
                
        except Exception as e:
            print(f"❌ [SCHEDULER] Error: {e}")
            time.sleep(60)

def execute_sample_schedules(current_time, current_hour, current_minute, current_day):
    """Thực thi lịch trình mẫu khi backend không có sẵn"""
    # Lịch trình mẫu cho đèn phòng khách
    if current_hour == 18 and current_minute == 0:  # 6:00 PM
        print(f"⏰ [SCHEDULER] Sample: Turning on Living Room Light")
        socketio.emit('deviceUpdated', {
            'id': '1',
            'state': True,
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })
    
    elif current_hour == 23 and current_minute == 0:  # 11:00 PM
        print(f"⏰ [SCHEDULER] Sample: Turning off Living Room Light")
        socketio.emit('deviceUpdated', {
            'id': '1',
            'state': False,
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })
    
    elif current_hour == 7 and current_minute == 0 and current_day in [0, 1, 2, 3, 4]:  # 7:00 AM weekday
        print(f"⏰ [SCHEDULER] Sample: Morning routine - Turn on all lights")
        socketio.emit('deviceUpdated', {
            'id': '1',
            'state': True,
            'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })

# ==================== ADDITIONAL API ROUTES ====================

@app.route('/test-backend')
def test_backend():
    """Test backend connection"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=3)
        if response.status_code == 200:
            return jsonify({
                'success': True,
                'backend_status': 'connected',
                'response': response.json()
            })
        else:
            return jsonify({
                'success': False,
                'backend_status': 'error',
                'status_code': response.status_code
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'backend_status': 'disconnected',
            'error': str(e)
        })

@app.route('/delete_device', methods=['POST'])
def delete_device():
    """Delete device route"""
    try:
        data = request.get_json()
        device_id = data.get('deviceId')
        
        print(f"🗑️ [FLASK] Delete device {device_id}")
        
        # Send socket update
        socketio.emit('deviceDeleted', {
            'id': device_id
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

@app.route('/health')
def health():
    """Health check endpoint"""
    try:
        # Test backend connection
        backend_response = requests.get(f"{BACKEND_URL}/health", timeout=3)
        backend_status = 'connected' if backend_response.status_code == 200 else 'error'
    except:
        backend_status = 'disconnected'
    
    return jsonify({
        'status': 'healthy',
        'service': 'flask-frontend',
        'timestamp': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        'backend_status': backend_status,
        'services': {
            'api': 'running',
            'socketio': 'running',
            'scheduler': 'active',
            'sensor_sim': 'active',
            'automation': 'active'
        }
    })

@app.route('/api/schedules/check')
def check_schedules():
    """Check schedule status"""
    return jsonify({
        'status': 'active',
        'last_check': time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        'next_check': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 60))
    })

# ==================== MAIN ====================

if __name__ == '__main__':
    print('''
============================================================
🚀 Flask Frontend Server với Tự động hóa Ánh sáng
============================================================
🏠 Homepage:     http://localhost:5000/
🔐 Login:        http://localhost:5000/login
📝 Create Acc:   http://localhost:5000/createaccount
👤 Account:      http://localhost:5000/account
📱 Devices:      http://localhost:5000/devices
➕ Add Device:   http://localhost:5000/adddevice
🤖 Automation:   http://localhost:5000/automation
📡 Sensors:      http://localhost:5000/sensors
💡 Light Control: http://localhost:5000/light-control
📅 Schedules:    http://localhost:5000/schedules
📊 Analytics:    http://localhost:5000/analytics
🔗 Backend:      http://localhost:3000
💚 Health:       http://localhost:5000/health
⏰ Scheduler:    http://localhost:5000/api/schedules/check
📈 Real-time:    Active (3s interval)
⏰ Sensor Sim:   Active (10s interval)
🤖 Automation:   Active
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
    
    # Start sensor simulation thread
    sensor_thread = threading.Thread(target=simulate_light_sensors, daemon=True)
    sensor_thread.start()
    
    print("⏰ Schedule executor: ACTIVE (checking every minute)")
    print("📡 Light sensor simulation: ACTIVE (updating every 10s)")
    print("🤖 Automation system: ACTIVE")
    print("============================================================")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)