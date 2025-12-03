require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// In-memory user storage
const users = [];

// In-memory device storage (bao gồm cảm biến)
const devices = [
  {
    id: '1',
    name: 'Living Room Light',
    type: 'Light',
    subtype: 'LED', // LED, Bulb, etc.
    status: 'On',
    room: 'Living Room',
    power: 45,
    brightness: 75, // 0-100%
    mode: 'manual', // manual, auto, schedule
    sensorId: 'sensor_light_1', // ID của cảm biến ánh sáng liên kết
    lastActivity: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Kitchen AC',
    type: 'AC',
    status: 'On',
    room: 'Kitchen',
    power: 120,
    temperature: 24,
    lastActivity: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Bedroom TV',
    type: 'TV',
    status: 'Off',
    room: 'Bedroom',
    power: 0,
    lastActivity: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '4',
    name: 'Living Room Light Sensor',
    type: 'Sensor',
    subtype: 'Light',
    status: 'Active',
    room: 'Living Room',
    luxValue: 350, // Giá trị ánh sáng đo được (lux)
    threshold: 200, // Ngưỡng ánh sáng để bật đèn
    updateInterval: 10, // Cập nhật mỗi 10 giây
    linkedDevice: '1', // Liên kết với đèn ID 1
    lastUpdate: new Date().toISOString()
  }
];

// In-memory sensor data log
const sensorDataLog = [
  {
    id: 'log_1',
    sensorId: 'sensor_light_1',
    luxValue: 350,
    timestamp: new Date().toISOString(),
    action: 'none', // none, turned_on, turned_off
    deviceState: 'On'
  }
];

// In-memory automation rules
const automationRules = [
  {
    id: 'rule_1',
    name: 'Tự động bật/tắt đèn theo ánh sáng',
    description: 'Tự động điều chỉnh đèn dựa trên cảm biến ánh sáng',
    sensorId: 'sensor_light_1',
    deviceId: '1',
    conditions: [
      {
        type: 'lux',
        operator: '<',
        value: 200,
        action: 'turn_on',
        brightness: 80
      },
      {
        type: 'lux',
        operator: '>',
        value: 500,
        action: 'turn_off'
      }
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rule_2',
    name: 'Điều chỉnh độ sáng theo ánh sáng',
    description: 'Tự động điều chỉnh độ sáng đèn theo cường độ ánh sáng môi trường',
    sensorId: 'sensor_light_1',
    deviceId: '1',
    conditions: [
      {
        type: 'lux_range',
        min: 200,
        max: 500,
        action: 'adjust_brightness',
        brightnessFormula: '100 - ((lux - 200) / 3)' // Công thức tính độ sáng
      }
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// In-memory schedule storage
const schedules = [
  {
    id: '1',
    deviceId: '1',
    deviceName: 'Living Room Light',
    deviceType: 'Light',
    location: 'Living Room',
    timeOn: '08:00',
    timeOff: '23:00',
    note: 'Auto turn on/off lights',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    deviceId: '2',
    deviceName: 'Kitchen AC',
    deviceType: 'AC',
    location: 'Bedroom',
    timeOn: '22:00',
    timeOff: null,
    note: 'Turn on before sleep',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ==================== SOCKET.IO SETUP ====================
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_home')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ==================== SOCKET.IO EVENTS ====================
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
    
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`👤 Client ${socket.id} joined room: ${room}`);
    });
    
    socket.on('requestRealTimeData', () => {
        console.log('📡 Client requested real-time data');
        
        // Send initial real-time data
        const realTimeData = {
            timestamp: new Date().toISOString(),
            temperature: 22 + Math.floor(Math.random() * 5),
            humidity: 60 + Math.floor(Math.random() * 15),
            airQuality: ['Good', 'Fair', 'Excellent'][Math.floor(Math.random() * 3)],
            activeDevices: devices.filter(d => d.status === 'On').length,
            energySaved: parseFloat((Math.random() * 10 + 20).toFixed(1))
        };
        
        socket.emit('realTimeUpdate', realTimeData);
    });
    
    socket.on('deviceToggle', (data) => {
        console.log('🔘 Device toggle:', data);
        
        // Update device status in memory
        const deviceIndex = devices.findIndex(d => d.id === data.deviceId);
        if (deviceIndex !== -1) {
            devices[deviceIndex].status = data.state ? 'On' : 'Off';
            devices[deviceIndex].lastActivity = new Date().toISOString();
            
            // Nếu là đèn và có brightness
            if (data.brightness !== undefined && devices[deviceIndex].type === 'Light') {
                devices[deviceIndex].brightness = data.brightness;
            }
        }
        
        // Broadcast to all connected clients
        io.emit('deviceUpdated', {
            ...data,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('deviceAdded', (data) => {
        console.log('➕ Device added:', data);
        
        // Add to devices array
        devices.push({
            id: Date.now().toString(),
            name: data.name,
            type: data.type,
            subtype: data.subtype || '',
            status: data.status || 'Off',
            room: data.room,
            power: data.power || 0,
            brightness: data.brightness || 100,
            mode: data.mode || 'manual',
            sensorId: data.sensorId || '',
            lastActivity: new Date().toISOString()
        });
        
        // Broadcast new device to all clients
        io.emit('deviceListUpdated', { devices });
    });

    socket.on('deviceDeleted', (data) => {
        console.log('🗑️ Device deleted:', data);
        
        // Remove device from array
        const deviceIndex = devices.findIndex(d => d.id === data.deviceId);
        if (deviceIndex !== -1) {
            devices.splice(deviceIndex, 1);
        }
        
        // Broadcast updated list
        io.emit('deviceListUpdated', { devices });
    });
    
    // ==================== SENSOR EVENTS ====================
    socket.on('sensorData', (data) => {
        console.log('📊 Sensor data received:', data);
        
        // Lưu dữ liệu cảm biến
        const sensorLog = {
            id: 'log_' + Date.now(),
            sensorId: data.sensorId,
            luxValue: data.luxValue,
            timestamp: new Date().toISOString(),
            action: 'none',
            deviceState: 'unknown'
        };
        
        sensorDataLog.push(sensorLog);
        
        // Kiểm tra automation rules
        checkAutomationRules(data.sensorId, data.luxValue);
        
        // Broadcast sensor data
        io.emit('sensorDataUpdate', {
            sensorId: data.sensorId,
            luxValue: data.luxValue,
            timestamp: new Date().toISOString()
        });
    });
    
    socket.on('updateSensor', (data) => {
        console.log('⚙️ Update sensor:', data);
        
        const sensorIndex = devices.findIndex(d => d.id === data.sensorId && d.type === 'Sensor');
        if (sensorIndex !== -1) {
            devices[sensorIndex] = {
                ...devices[sensorIndex],
                ...data.updates,
                lastUpdate: new Date().toISOString()
            };
            
            io.emit('sensorUpdated', devices[sensorIndex]);
        }
    });
    
    // ==================== AUTOMATION EVENTS ====================
    socket.on('getAutomationRules', () => {
        console.log('🤖 Client requested automation rules');
        socket.emit('automationRulesList', { rules: automationRules });
    });
    
    socket.on('createAutomationRule', (data) => {
        console.log('🤖 Create automation rule:', data);
        
        const newRule = {
            id: Date.now().toString(),
            ...data,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        automationRules.push(newRule);
        
        io.emit('automationRuleCreated', newRule);
        io.emit('automationRulesUpdated', { rules: automationRules });
    });
    
    socket.on('updateAutomationRule', (data) => {
        console.log('🤖 Update automation rule:', data);
        
        const ruleIndex = automationRules.findIndex(r => r.id === data.id);
        if (ruleIndex !== -1) {
            automationRules[ruleIndex] = {
                ...automationRules[ruleIndex],
                ...data.updates,
                updatedAt: new Date().toISOString()
            };
            
            io.emit('automationRuleUpdated', automationRules[ruleIndex]);
            io.emit('automationRulesUpdated', { rules: automationRules });
        }
    });
    
    socket.on('deleteAutomationRule', (data) => {
        console.log('🤖 Delete automation rule:', data);
        
        const ruleIndex = automationRules.findIndex(r => r.id === data.ruleId);
        if (ruleIndex !== -1) {
            automationRules.splice(ruleIndex, 1);
            
            io.emit('automationRuleDeleted', { ruleId: data.ruleId });
            io.emit('automationRulesUpdated', { rules: automationRules });
        }
    });
    
    socket.on('toggleAutomationRule', (data) => {
        console.log('🤖 Toggle automation rule:', data);
        
        const ruleIndex = automationRules.findIndex(r => r.id === data.ruleId);
        if (ruleIndex !== -1) {
            automationRules[ruleIndex].isActive = data.isActive;
            automationRules[ruleIndex].updatedAt = new Date().toISOString();
            
            io.emit('automationRuleUpdated', automationRules[ruleIndex]);
            io.emit('automationRulesUpdated', { rules: automationRules });
        }
    });
    
    // ==================== LIGHT CONTROL EVENTS ====================
    socket.on('updateLightBrightness', (data) => {
        console.log('💡 Update light brightness:', data);
        
        const deviceIndex = devices.findIndex(d => d.id === data.deviceId);
        if (deviceIndex !== -1 && devices[deviceIndex].type === 'Light') {
            devices[deviceIndex].brightness = data.brightness;
            devices[deviceIndex].lastActivity = new Date().toISOString();
            
            io.emit('deviceUpdated', {
                id: data.deviceId,
                state: devices[deviceIndex].status === 'On',
                brightness: data.brightness,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    socket.on('changeLightMode', (data) => {
        console.log('💡 Change light mode:', data);
        
        const deviceIndex = devices.findIndex(d => d.id === data.deviceId);
        if (deviceIndex !== -1 && devices[deviceIndex].type === 'Light') {
            devices[deviceIndex].mode = data.mode;
            devices[deviceIndex].lastActivity = new Date().toISOString();
            
            io.emit('deviceUpdated', {
                id: data.deviceId,
                mode: data.mode,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // ... (phần còn lại của Socket.IO events giữ nguyên)
});

// ==================== HELPER FUNCTIONS ====================

// Hàm kiểm tra và thực thi automation rules
function checkAutomationRules(sensorId, luxValue) {
    console.log(`🤖 Checking automation rules for sensor ${sensorId}, lux: ${luxValue}`);
    
    // Tìm tất cả rules active liên quan đến sensor này
    const relevantRules = automationRules.filter(rule => 
        rule.sensorId === sensorId && rule.isActive
    );
    
    relevantRules.forEach(rule => {
        rule.conditions.forEach(condition => {
            let shouldExecute = false;
            let action = null;
            let brightness = null;
            
            switch(condition.type) {
                case 'lux':
                    if (condition.operator === '<' && luxValue < condition.value) {
                        shouldExecute = true;
                        action = condition.action;
                        brightness = condition.brightness;
                    } else if (condition.operator === '>' && luxValue > condition.value) {
                        shouldExecute = true;
                        action = condition.action;
                    } else if (condition.operator === '<=' && luxValue <= condition.value) {
                        shouldExecute = true;
                        action = condition.action;
                        brightness = condition.brightness;
                    } else if (condition.operator === '>=' && luxValue >= condition.value) {
                        shouldExecute = true;
                        action = condition.action;
                    }
                    break;
                    
                case 'lux_range':
                    if (luxValue >= condition.min && luxValue <= condition.max) {
                        shouldExecute = true;
                        action = condition.action;
                        // Tính toán brightness dựa trên công thức
                        if (condition.brightnessFormula) {
                            try {
                                const formula = condition.brightnessFormula
                                    .replace(/lux/g, luxValue)
                                    .replace(/min/g, condition.min)
                                    .replace(/max/g, condition.max);
                                brightness = eval(formula);
                                brightness = Math.max(0, Math.min(100, Math.round(brightness)));
                            } catch (e) {
                                console.error('Error calculating brightness:', e);
                                brightness = 50; // Giá trị mặc định
                            }
                        }
                    }
                    break;
            }
            
            if (shouldExecute && action) {
                executeAutomationAction(rule.deviceId, action, brightness, rule.id, luxValue);
            }
        });
    });
}

// Hàm thực thi action từ automation rule
function executeAutomationAction(deviceId, action, brightness, ruleId, luxValue) {
    console.log(`🤖 Executing automation: ${action} on device ${deviceId}, rule: ${ruleId}`);
    
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) return;
    
    const device = devices[deviceIndex];
    
    // Nếu device không ở chế độ auto, không thực thi
    if (device.mode !== 'auto' && action !== 'adjust_brightness') return;
    
    switch(action) {
        case 'turn_on':
            if (device.status !== 'On') {
                devices[deviceIndex].status = 'On';
                devices[deviceIndex].lastActivity = new Date().toISOString();
                
                if (brightness !== undefined && device.type === 'Light') {
                    devices[deviceIndex].brightness = brightness;
                }
                
                io.emit('deviceUpdated', {
                    id: deviceId,
                    state: true,
                    brightness: brightness,
                    triggeredBy: 'automation',
                    ruleId: ruleId,
                    luxValue: luxValue,
                    timestamp: new Date().toISOString()
                });
                
                // Ghi log
                const logEntry = {
                    id: 'auto_log_' + Date.now(),
                    ruleId: ruleId,
                    deviceId: deviceId,
                    deviceName: device.name,
                    action: 'turn_on',
                    luxValue: luxValue,
                    timestamp: new Date().toISOString()
                };
                
                if (global.automationLogs) {
                    global.automationLogs.push(logEntry);
                }
            }
            break;
            
        case 'turn_off':
            if (device.status !== 'Off') {
                devices[deviceIndex].status = 'Off';
                devices[deviceIndex].lastActivity = new Date().toISOString();
                
                io.emit('deviceUpdated', {
                    id: deviceId,
                    state: false,
                    triggeredBy: 'automation',
                    ruleId: ruleId,
                    luxValue: luxValue,
                    timestamp: new Date().toISOString()
                });
            }
            break;
            
        case 'adjust_brightness':
            if (device.type === 'Light' && brightness !== undefined && device.status === 'On') {
                // Chỉ điều chỉnh nếu độ sáng thay đổi đáng kể (> 5%)
                if (Math.abs(device.brightness - brightness) > 5) {
                    devices[deviceIndex].brightness = brightness;
                    devices[deviceIndex].lastActivity = new Date().toISOString();
                    
                    io.emit('deviceUpdated', {
                        id: deviceId,
                        brightness: brightness,
                        triggeredBy: 'automation',
                        ruleId: ruleId,
                        luxValue: luxValue,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            break;
    }
}

// Khởi tạo automation logs nếu chưa có
if (!global.automationLogs) {
    global.automationLogs = [];
}

// ==================== API ROUTES ====================

// ... (Các route hiện có giữ nguyên)

// ==================== SENSOR API ROUTES ====================

// Get all sensors
app.get('/api/sensors', (req, res) => {
    try {
        const sensors = devices.filter(d => d.type === 'Sensor');
        const sensorsWithLinkedDevices = sensors.map(sensor => {
            const linkedDevice = devices.find(d => d.id === sensor.linkedDevice);
            return {
                ...sensor,
                linkedDeviceInfo: linkedDevice ? {
                    id: linkedDevice.id,
                    name: linkedDevice.name,
                    type: linkedDevice.type,
                    status: linkedDevice.status
                } : null
            };
        });
        
        res.json({
            success: true,
            count: sensors.length,
            sensors: sensorsWithLinkedDevices
        });
    } catch (error) {
        console.error('❌ Error getting sensors:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching sensors'
        });
    }
});

// Get sensor data log
app.get('/api/sensors/:id/logs', (req, res) => {
    try {
        const sensorId = req.params.id;
        const limit = parseInt(req.query.limit) || 50;
        
        const sensorLogs = sensorDataLog
            .filter(log => log.sensorId === sensorId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
        
        res.json({
            success: true,
            count: sensorLogs.length,
            logs: sensorLogs
        });
    } catch (error) {
        console.error('❌ Error getting sensor logs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching sensor logs'
        });
    }
});

// Update sensor
app.put('/api/sensors/:id', (req, res) => {
    try {
        const sensorId = req.params.id;
        const updates = req.body;
        
        console.log(`⚙️ Update sensor: ${sensorId}`, updates);
        
        const sensorIndex = devices.findIndex(d => d.id === sensorId && d.type === 'Sensor');
        if (sensorIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Sensor not found'
            });
        }
        
        devices[sensorIndex] = {
            ...devices[sensorIndex],
            ...updates,
            lastUpdate: new Date().toISOString()
        };
        
        // Emit socket event
        io.emit('sensorUpdated', devices[sensorIndex]);
        
        res.json({
            success: true,
            message: 'Sensor updated successfully',
            sensor: devices[sensorIndex]
        });
    } catch (error) {
        console.error('❌ Error updating sensor:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating sensor'
        });
    }
});

// Submit sensor data
app.post('/api/sensors/data', (req, res) => {
    try {
        const { sensorId, luxValue } = req.body;
        
        console.log(`📊 Sensor data: ${sensorId} = ${luxValue} lux`);
        
        if (!sensorId || luxValue === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Sensor ID and lux value are required'
            });
        }
        
        // Tìm sensor
        const sensorIndex = devices.findIndex(d => d.id === sensorId && d.type === 'Sensor');
        if (sensorIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Sensor not found'
            });
        }
        
        // Cập nhật giá trị sensor
        devices[sensorIndex].luxValue = luxValue;
        devices[sensorIndex].lastUpdate = new Date().toISOString();
        
        // Lưu log
        const sensorLog = {
            id: 'log_' + Date.now(),
            sensorId: sensorId,
            luxValue: luxValue,
            timestamp: new Date().toISOString(),
            action: 'none',
            deviceState: 'unknown'
        };
        
        sensorDataLog.push(sensorLog);
        
        // Kiểm tra automation rules
        checkAutomationRules(sensorId, luxValue);
        
        // Emit socket event
        io.emit('sensorDataUpdate', {
            sensorId: sensorId,
            luxValue: luxValue,
            timestamp: new Date().toISOString()
        });
        
        io.emit('sensorUpdated', devices[sensorIndex]);
        
        res.json({
            success: true,
            message: 'Sensor data received',
            sensor: devices[sensorIndex]
        });
    } catch (error) {
        console.error('❌ Error submitting sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while processing sensor data'
        });
    }
});

// ==================== AUTOMATION API ROUTES ====================

// Get all automation rules
app.get('/api/automation/rules', (req, res) => {
    try {
        // Kết hợp thông tin device và sensor vào rules
        const rulesWithDetails = automationRules.map(rule => {
            const sensor = devices.find(d => d.id === rule.sensorId);
            const device = devices.find(d => d.id === rule.deviceId);
            
            return {
                ...rule,
                sensorInfo: sensor ? {
                    id: sensor.id,
                    name: sensor.name,
                    room: sensor.room,
                    currentLux: sensor.luxValue
                } : null,
                deviceInfo: device ? {
                    id: device.id,
                    name: device.name,
                    type: device.type,
                    status: device.status,
                    mode: device.mode
                } : null
            };
        });
        
        res.json({
            success: true,
            count: rulesWithDetails.length,
            rules: rulesWithDetails
        });
    } catch (error) {
        console.error('❌ Error getting automation rules:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching automation rules'
        });
    }
});

// Create automation rule
app.post('/api/automation/rules', (req, res) => {
    try {
        const { name, description, sensorId, deviceId, conditions } = req.body;
        
        console.log('🤖 Create automation rule:', { name, sensorId, deviceId });
        
        if (!name || !sensorId || !deviceId || !conditions || !Array.isArray(conditions)) {
            return res.status(400).json({
                success: false,
                message: 'Name, sensor ID, device ID, and conditions are required'
            });
        }
        
        // Kiểm tra sensor và device tồn tại
        const sensorExists = devices.some(d => d.id === sensorId && d.type === 'Sensor');
        const deviceExists = devices.some(d => d.id === deviceId);
        
        if (!sensorExists || !deviceExists) {
            return res.status(400).json({
                success: false,
                message: 'Sensor or device not found'
            });
        }
        
        const newRule = {
            id: Date.now().toString(),
            name,
            description: description || '',
            sensorId,
            deviceId,
            conditions,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        automationRules.push(newRule);
        
        // Emit socket event
        io.emit('automationRuleCreated', newRule);
        io.emit('automationRulesUpdated', { rules: automationRules });
        
        res.status(201).json({
            success: true,
            message: 'Automation rule created successfully',
            rule: newRule
        });
    } catch (error) {
        console.error('❌ Error creating automation rule:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating automation rule'
        });
    }
});

// Update automation rule
app.put('/api/automation/rules/:id', (req, res) => {
    try {
        const ruleId = req.params.id;
        const updates = req.body;
        
        console.log(`🤖 Update automation rule: ${ruleId}`, updates);
        
        const ruleIndex = automationRules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Automation rule not found'
            });
        }
        
        automationRules[ruleIndex] = {
            ...automationRules[ruleIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Emit socket event
        io.emit('automationRuleUpdated', automationRules[ruleIndex]);
        io.emit('automationRulesUpdated', { rules: automationRules });
        
        res.json({
            success: true,
            message: 'Automation rule updated successfully',
            rule: automationRules[ruleIndex]
        });
    } catch (error) {
        console.error('❌ Error updating automation rule:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating automation rule'
        });
    }
});

// Delete automation rule
app.delete('/api/automation/rules/:id', (req, res) => {
    try {
        const ruleId = req.params.id;
        
        console.log(`🤖 Delete automation rule: ${ruleId}`);
        
        const ruleIndex = automationRules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Automation rule not found'
            });
        }
        
        const deletedRule = automationRules.splice(ruleIndex, 1)[0];
        
        // Emit socket event
        io.emit('automationRuleDeleted', { ruleId });
        io.emit('automationRulesUpdated', { rules: automationRules });
        
        res.json({
            success: true,
            message: 'Automation rule deleted successfully',
            rule: deletedRule
        });
    } catch (error) {
        console.error('❌ Error deleting automation rule:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting automation rule'
        });
    }
});

// Toggle automation rule
app.post('/api/automation/rules/:id/toggle', (req, res) => {
    try {
        const ruleId = req.params.id;
        const { isActive } = req.body;
        
        console.log(`🤖 Toggle automation rule: ${ruleId} to ${isActive}`);
        
        const ruleIndex = automationRules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Automation rule not found'
            });
        }
        
        automationRules[ruleIndex].isActive = isActive;
        automationRules[ruleIndex].updatedAt = new Date().toISOString();
        
        // Emit socket event
        io.emit('automationRuleUpdated', automationRules[ruleIndex]);
        io.emit('automationRulesUpdated', { rules: automationRules });
        
        res.json({
            success: true,
            message: `Automation rule ${isActive ? 'activated' : 'deactivated'} successfully`,
            rule: automationRules[ruleIndex]
        });
    } catch (error) {
        console.error('❌ Error toggling automation rule:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while toggling automation rule'
        });
    }
});

// Get automation logs
app.get('/api/automation/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        
        const logs = global.automationLogs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
        
        res.json({
            success: true,
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error('❌ Error getting automation logs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching automation logs'
        });
    }
});

// ==================== LIGHT CONTROL API ROUTES ====================

// Update light brightness
app.post('/api/lights/:id/brightness', (req, res) => {
    try {
        const lightId = req.params.id;
        const { brightness } = req.body;
        
        console.log(`💡 Update light brightness: ${lightId} = ${brightness}%`);
        
        if (brightness === undefined || brightness < 0 || brightness > 100) {
            return res.status(400).json({
                success: false,
                message: 'Brightness must be between 0 and 100'
            });
        }
        
        const deviceIndex = devices.findIndex(d => d.id === lightId && d.type === 'Light');
        if (deviceIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Light device not found'
            });
        }
        
        devices[deviceIndex].brightness = brightness;
        devices[deviceIndex].lastActivity = new Date().toISOString();
        
        // Emit socket event
        io.emit('deviceUpdated', {
            id: lightId,
            brightness: brightness,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'Light brightness updated successfully',
            device: devices[deviceIndex]
        });
    } catch (error) {
        console.error('❌ Error updating light brightness:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating light brightness'
        });
    }
});

// Change light mode
app.post('/api/lights/:id/mode', (req, res) => {
    try {
        const lightId = req.params.id;
        const { mode } = req.body;
        
        console.log(`💡 Change light mode: ${lightId} = ${mode}`);
        
        const validModes = ['manual', 'auto', 'schedule'];
        if (!validModes.includes(mode)) {
            return res.status(400).json({
                success: false,
                message: `Mode must be one of: ${validModes.join(', ')}`
            });
        }
        
        const deviceIndex = devices.findIndex(d => d.id === lightId && d.type === 'Light');
        if (deviceIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Light device not found'
            });
        }
        
        devices[deviceIndex].mode = mode;
        devices[deviceIndex].lastActivity = new Date().toISOString();
        
        // Emit socket event
        io.emit('deviceUpdated', {
            id: lightId,
            mode: mode,
            timestamp: new Date().toISOString()
        });
        
        res.json({
            success: true,
            message: 'Light mode updated successfully',
            device: devices[deviceIndex]
        });
    } catch (error) {
        console.error('❌ Error changing light mode:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while changing light mode'
        });
    }
});

// Get light sensor data for a specific light
app.get('/api/lights/:id/sensor-data', (req, res) => {
    try {
        const lightId = req.params.id;
        const limit = parseInt(req.query.limit) || 50;
        
        // Tìm sensor liên kết với đèn này
        const sensor = devices.find(d => 
            d.type === 'Sensor' && 
            d.subtype === 'Light' && 
            d.linkedDevice === lightId
        );
        
        if (!sensor) {
            return res.status(404).json({
                success: false,
                message: 'No light sensor found for this light'
            });
        }
        
        // Lấy log dữ liệu cảm biến
        const sensorLogs = sensorDataLog
            .filter(log => log.sensorId === sensor.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
        
        // Lấy thông tin automation rules liên quan
        const relatedRules = automationRules.filter(rule => 
            rule.deviceId === lightId || rule.sensorId === sensor.id
        );
        
        res.json({
            success: true,
            lightId: lightId,
            sensor: {
                id: sensor.id,
                name: sensor.name,
                currentLux: sensor.luxValue,
                threshold: sensor.threshold,
                lastUpdate: sensor.lastUpdate
            },
            logs: sensorLogs,
            automationRules: relatedRules,
            currentBrightness: devices.find(d => d.id === lightId)?.brightness || 0
        });
    } catch (error) {
        console.error('❌ Error getting light sensor data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching light sensor data'
        });
    }
});

// ==================== DEVICE API ROUTES (UPDATED) ====================

// Get all devices (updated to include sensor info)
app.get('/api/devices', (req, res) => {
    // Thêm thông tin sensor cho các đèn
    const devicesWithSensorInfo = devices.map(device => {
        if (device.type === 'Light' && device.sensorId) {
            const sensor = devices.find(d => d.id === device.sensorId);
            return {
                ...device,
                sensorInfo: sensor ? {
                    id: sensor.id,
                    name: sensor.name,
                    luxValue: sensor.luxValue,
                    threshold: sensor.threshold
                } : null
            };
        }
        return device;
    });
    
    res.json(devicesWithSensorInfo);
});

// Toggle device (updated to support brightness)
app.post('/api/devices/toggle', (req, res) => {
    const { deviceId, state, brightness } = req.body;
    console.log('🔄 [BACKEND] Toggle device ' + deviceId + ' to ' + state + (brightness ? `, brightness: ${brightness}%` : ''));
    
    // Update device status
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
        devices[deviceIndex].status = state ? 'On' : 'Off';
        devices[deviceIndex].lastActivity = new Date().toISOString();
        
        // Update brightness if provided
        if (brightness !== undefined && devices[deviceIndex].type === 'Light') {
            devices[deviceIndex].brightness = brightness;
        }
    }
    
    res.json({
        success: true,
        message: 'Device ' + deviceId + ' toggled to ' + (state ? 'ON' : 'OFF'),
        deviceId,
        state,
        brightness
    });
});

// Add new device (updated to support sensor and light properties)
app.post('/api/devices', (req, res) => {
    try {
        const { name, type, subtype, room, power, status, brightness, mode, sensorId } = req.body;
        
        console.log('➕ [BACKEND] Add device request:', { name, type, subtype, room });
        
        if (!name || !type || !room) {
            return res.status(400).json({
                success: false,
                message: 'Device name, type, and room are required'
            });
        }
        
        // Create new device
        const newDevice = {
            id: Date.now().toString(),
            name,
            type,
            subtype: subtype || '',
            status: status || 'Off',
            room,
            power: power || 0,
            brightness: brightness || 100,
            mode: mode || 'manual',
            sensorId: sensorId || '',
            lastActivity: new Date().toISOString()
        };
        
        devices.push(newDevice);
        
        // Nếu là sensor, tự động tạo automation rule mẫu
        if (type === 'Sensor' && subtype === 'Light' && req.body.linkedDevice) {
            const sampleRule = {
                id: Date.now().toString() + '_rule',
                name: `Tự động cho ${name}`,
                description: `Tự động điều khiển đèn dựa trên ${name}`,
                sensorId: newDevice.id,
                deviceId: req.body.linkedDevice,
                conditions: [
                    {
                        type: 'lux',
                        operator: '<',
                        value: 200,
                        action: 'turn_on',
                        brightness: 80
                    },
                    {
                        type: 'lux',
                        operator: '>',
                        value: 500,
                        action: 'turn_off'
                    }
                ],
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            automationRules.push(sampleRule);
            console.log(`✅ [BACKEND] Created sample automation rule for new sensor`);
        }
        
        // Emit socket events
        io.emit('deviceAdded', newDevice);
        io.emit('deviceListUpdated', { devices });
        
        if (type === 'Sensor') {
            io.emit('sensorUpdated', newDevice);
        }
        
        console.log('✅ [BACKEND] Device added: ' + name + ' (Total devices: ' + devices.length + ')');
        
        res.status(201).json({
            success: true,
            message: 'Device added successfully',
            device: newDevice
        });
        
    } catch (error) {
        console.error('❌ [BACKEND] Add device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding device',
            error: error.message
        });
    }
});

// ==================== HEALTH CHECK (UPDATED) ====================

app.get('/health', (req, res) => {
    const sensors = devices.filter(d => d.type === 'Sensor');
    const lights = devices.filter(d => d.type === 'Light');
    
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            api: 'running',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            users_count: users.length,
            devices_count: devices.length,
            sensors_count: sensors.length,
            lights_count: lights.length,
            automation_rules_count: automationRules.length,
            schedules_count: schedules.length,
            scheduler: 'active',
            automation: 'active'
        },
        automation: {
            active_rules: automationRules.filter(r => r.isActive).length,
            total_rules: automationRules.length,
            last_checked: new Date().toISOString()
        }
    });
});

// ... (Các route còn lại giữ nguyên)

// ==================== SIMULATE SENSOR DATA ====================

// Hàm mô phỏng dữ liệu cảm biến ánh sáng
function simulateSensorData() {
    setInterval(() => {
        // Tìm tất cả cảm biến ánh sáng
        const lightSensors = devices.filter(d => 
            d.type === 'Sensor' && d.subtype === 'Light'
        );
        
        lightSensors.forEach(sensor => {
            // Tạo giá trị ánh sáng ngẫu nhiên (mô phỏng)
            const hour = new Date().getHours();
            let baseLux;
            
            // Mô phỏng ánh sáng theo thời gian trong ngày
            if (hour >= 6 && hour < 18) {
                // Ban ngày: ánh sáng mạnh
                baseLux = 300 + Math.random() * 700;
            } else if (hour >= 18 && hour < 20) {
                // Hoàng hôn: ánh sáng yếu
                baseLux = 100 + Math.random() * 200;
            } else {
                // Ban đêm: ánh sáng rất yếu
                baseLux = 10 + Math.random() * 90;
            }
            
            // Thêm nhiễu ngẫu nhiên
            const luxValue = Math.max(0, Math.round(baseLux + (Math.random() - 0.5) * 100));
            
            // Cập nhật giá trị sensor
            const sensorIndex = devices.findIndex(d => d.id === sensor.id);
            if (sensorIndex !== -1) {
                devices[sensorIndex].luxValue = luxValue;
                devices[sensorIndex].lastUpdate = new Date().toISOString();
                
                // Lưu log
                const sensorLog = {
                    id: 'log_' + Date.now() + '_' + Math.random(),
                    sensorId: sensor.id,
                    luxValue: luxValue,
                    timestamp: new Date().toISOString(),
                    action: 'none',
                    deviceState: 'unknown'
                };
                
                sensorDataLog.push(sensorLog);
                
                // Kiểm tra automation rules
                checkAutomationRules(sensor.id, luxValue);
                
                // Broadcast via socket
                io.emit('sensorDataUpdate', {
                    sensorId: sensor.id,
                    luxValue: luxValue,
                    timestamp: new Date().toISOString()
                });
                
                io.emit('sensorUpdated', devices[sensorIndex]);
            }
        });
    }, 10000); // Cập nhật mỗi 10 giây
}

// ==================== START SERVER ====================

server.listen(PORT, () => {
    console.log(`
============================================================
🚀 IoT Smart Home Full Stack Started
============================================================
🌐 Server:     http://localhost:${PORT}
🏠 Homepage:   http://localhost:${PORT}/
🔐 Login:      http://localhost:${PORT}/login
📝 Register:   http://localhost:${PORT}/register
👤 Account:    http://localhost:${PORT}/account
📱 Devices:    http://localhost:${PORT}/devices
➕ Add Device: http://localhost:${PORT}/adddevice
📅 Schedules:  http://localhost:${PORT}/schedules.html
🔌 Socket.IO:  ws://localhost:${PORT}
📊 Analytics:  http://localhost:${PORT}/api/analytics
🤖 Automation: http://localhost:${PORT}/api/automation/rules
📡 Sensors:    http://localhost:${PORT}/api/sensors
💡 Light Control: http://localhost:${PORT}/api/lights
⏰ Scheduler:  Active (60s interval)
⏰ Sensor Sim: Active (10s interval)
💚 Health:     http://localhost:${PORT}/health
👥 Admin:      http://localhost:${PORT}/admin/users
🔐 Admin Login: http://localhost:${PORT}/admin/login
============================================================
✅ Full stack application ready!
🤖 Automation System: ACTIVE
📡 Light Sensor Simulation: ACTIVE
============================================================
    `);
    
    // Bắt đầu mô phỏng dữ liệu cảm biến
    simulateSensorData();
    console.log('📡 Light sensor simulation started (10s interval)');
});