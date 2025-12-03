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

// In-memory device storage (cho demo)
const devices = [
  {
    id: '1',
    name: 'Living Room Light',
    type: 'Light',
    status: 'On',
    room: 'Living Room',
    power: 45,
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
            activeDevices: 5,
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
            status: data.status || 'Off',
            room: data.room,
            power: data.power || 0,
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
    
    // Add these handlers for schedules
    socket.on('joinScheduleRoom', (scheduleId) => {
        socket.join(`schedule:${scheduleId}`);
        console.log(`📅 Client ${socket.id} joined schedule room: ${scheduleId}`);
    });
    
    socket.on('requestSchedules', () => {
        console.log('📅 Client requested schedules');
        socket.emit('schedulesList', { schedules });
    });
    
    socket.on('createSchedule', (data) => {
        console.log('📅 Client creating schedule:', data);
        
        // Create new schedule
        const newSchedule = {
            id: Date.now().toString(),
            ...data,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        schedules.push(newSchedule);
        
        // Broadcast to all clients
        io.emit('scheduleCreated', newSchedule);
        io.emit('schedulesUpdated', { schedules });
    });
    
    socket.on('updateSchedule', (data) => {
        console.log('📅 Client updating schedule:', data);
        
        const scheduleIndex = schedules.findIndex(s => s.id === data.id);
        if (scheduleIndex !== -1) {
            schedules[scheduleIndex] = {
                ...schedules[scheduleIndex],
                ...data,
                updatedAt: new Date().toISOString()
            };
            
            // Broadcast to all clients
            io.emit('scheduleUpdated', schedules[scheduleIndex]);
            io.emit('schedulesUpdated', { schedules });
        }
    });
    
    socket.on('deleteSchedule', (data) => {
        console.log('📅 Client deleting schedule:', data);
        
        const scheduleIndex = schedules.findIndex(s => s.id === data.scheduleId);
        if (scheduleIndex !== -1) {
            schedules.splice(scheduleIndex, 1);
            
            // Broadcast to all clients
            io.emit('scheduleDeleted', { scheduleId: data.scheduleId });
            io.emit('schedulesUpdated', { schedules });
        }
    });
    
    socket.on('toggleSchedule', (data) => {
        console.log('📅 Client toggling schedule:', data);
        
        const scheduleIndex = schedules.findIndex(s => s.id === data.scheduleId);
        if (scheduleIndex !== -1) {
            schedules[scheduleIndex].isActive = data.isActive;
            schedules[scheduleIndex].updatedAt = new Date().toISOString();
            
            // Broadcast to all clients
            io.emit('scheduleUpdated', schedules[scheduleIndex]);
            io.emit('schedulesUpdated', { schedules });
        }
    });
});

// ==================== STATIC FILES ROUTES ====================

// Serve homepage.html
app.get('/home', (req, res) => {
    const filePath = path.join(__dirname, 'homepage.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('❌ Error reading homepage:', err);
            res.status(500).json({
                success: false,
                message: 'Could not load homepage'
            });
            return;
        }
        
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
});

// Serve homepage at root
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'homepage.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('❌ Error reading homepage:', err);
            res.status(500).json({
                success: false,
                message: 'Could not load homepage'
            });
            return;
        }
        
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
});

// Serve adddevice.html
app.get('/adddevice', (req, res) => {
    const filePath = path.join(__dirname, 'adddevice.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('❌ Error reading adddevice page:', err);
            res.status(500).json({
                success: false,
                message: 'Could not load add device page'
            });
            return;
        }
        
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
});

// ==================== ADMIN ROUTES ====================

// Serve admin page to view all registered users
app.get('/admin/users', (req, res) => {
    const adminHTML = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin - User Management</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                min-height: 100vh;
                color: #f3f4f6;
            }
            
            .header {
                background: rgba(31, 41, 55, 0.9);
                padding: 20px 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: sticky;
                top: 0;
                z-index: 100;
                backdrop-filter: blur(10px);
            }
            
            .logo {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .logo h1 {
                color: #60a5fa;
                font-size: 24px;
            }
            
            .nav-links {
                display: flex;
                gap: 25px;
            }
            
            .nav-links a {
                color: #9ca3af;
                text-decoration: none;
                padding: 8px 16px;
                border-radius: 8px;
                transition: all 0.3s;
                font-weight: 500;
            }
            
            .nav-links a:hover {
                background: #374151;
                color: #60a5fa;
            }
            
            .nav-links a.active {
                background: #3b82f6;
                color: white;
            }
            
            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 30px;
            }
            
            .admin-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding: 25px;
                background: rgba(31, 41, 55, 0.7);
                border-radius: 16px;
                border: 1px solid #374151;
            }
            
            .admin-header h1 {
                font-size: 32px;
                color: #60a5fa;
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .stats-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: rgba(31, 41, 55, 0.7);
                border-radius: 16px;
                padding: 25px;
                border: 1px solid #374151;
                transition: transform 0.3s, border-color 0.3s;
            }
            
            .stat-card:hover {
                transform: translateY(-5px);
                border-color: #3b82f6;
            }
            
            .stat-card h3 {
                color: #9ca3af;
                font-size: 14px;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .stat-card .value {
                color: white;
                font-size: 36px;
                font-weight: 700;
            }
            
            .stat-card .sub-value {
                color: #60a5fa;
                font-size: 14px;
                margin-top: 5px;
            }
            
            .users-table-container {
                background: rgba(31, 41, 55, 0.7);
                border-radius: 16px;
                padding: 30px;
                border: 1px solid #374151;
                margin-bottom: 30px;
            }
            
            .table-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
            }
            
            .table-header h2 {
                color: #60a5fa;
                font-size: 24px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .search-box {
                position: relative;
                width: 300px;
            }
            
            .search-box input {
                width: 100%;
                padding: 12px 16px 12px 45px;
                background: #111827;
                border: 1px solid #374151;
                border-radius: 10px;
                color: white;
                font-size: 14px;
            }
            
            .search-box input:focus {
                outline: none;
                border-color: #3b82f6;
            }
            
            .search-icon {
                position: absolute;
                left: 15px;
                top: 50%;
                transform: translateY(-50%);
                color: #9ca3af;
            }
            
            table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }
            
            thead {
                background: #111827;
            }
            
            th {
                padding: 18px 20px;
                text-align: left;
                color: #9ca3af;
                font-weight: 600;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                border-bottom: 1px solid #374151;
            }
            
            th:first-child {
                border-top-left-radius: 10px;
            }
            
            th:last-child {
                border-top-right-radius: 10px;
            }
            
            tbody tr {
                border-bottom: 1px solid #374151;
                transition: background 0.3s;
            }
            
            tbody tr:hover {
                background: rgba(59, 130, 246, 0.1);
            }
            
            td {
                padding: 20px;
                color: #d1d5db;
                border-bottom: 1px solid #374151;
            }
            
            td:first-child {
                font-weight: 600;
                color: white;
            }
            
            .user-id {
                color: #9ca3af;
                font-size: 12px;
                font-family: monospace;
            }
            
            .user-name {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .user-avatar {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
            }
            
            .user-email {
                color: #60a5fa;
                word-break: break-all;
            }
            
            .user-phone {
                color: #9ca3af;
            }
            
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .status-active {
                background: rgba(34, 197, 94, 0.1);
                color: #4ade80;
                border: 1px solid rgba(34, 197, 94, 0.3);
            }
            
            .user-actions {
                display: flex;
                gap: 10px;
            }
            
            .action-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .action-btn.view {
                background: rgba(59, 130, 246, 0.1);
                color: #60a5fa;
                border: 1px solid rgba(59, 130, 246, 0.3);
            }
            
            .action-btn.delete {
                background: rgba(239, 68, 68, 0.1);
                color: #f87171;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }
            
            .action-btn:hover {
                transform: translateY(-2px);
            }
            
            .action-btn.view:hover {
                background: rgba(59, 130, 246, 0.2);
            }
            
            .action-btn.delete:hover {
                background: rgba(239, 68, 68, 0.2);
            }
            
            .pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                margin-top: 30px;
            }
            
            .pagination-btn {
                padding: 10px 20px;
                background: rgba(31, 41, 55, 0.7);
                border: 1px solid #374151;
                border-radius: 8px;
                color: #9ca3af;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .pagination-btn:hover {
                background: #374151;
                color: white;
            }
            
            .pagination-btn.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            
            .message {
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                display: none;
                animation: slideIn 0.3s ease;
            }
            
            .message.success {
                background: rgba(34, 197, 94, 0.1);
                color: #4ade80;
                border: 1px solid rgba(34, 197, 94, 0.3);
                display: block;
            }
            
            .message.error {
                background: rgba(239, 68, 68, 0.1);
                color: #f87171;
                border: 1px solid rgba(239, 68, 68, 0.3);
                display: block;
            }
            
            .btn {
                padding: 12px 24px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
            }
            
            .export-btn {
                background: linear-gradient(135deg, #10b981 0%, #047857 100%);
            }
            
            .refresh-btn {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .no-data {
                text-align: center;
                padding: 60px;
                color: #9ca3af;
            }
            
            .no-data h3 {
                margin-bottom: 10px;
                color: #d1d5db;
            }
            
            .loading {
                text-align: center;
                padding: 60px;
                color: #9ca3af;
            }
            
            .loading-spinner {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 3px solid #374151;
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .container {
                    padding: 15px;
                }
                
                .header {
                    padding: 15px;
                }
                
                .nav-links {
                    gap: 10px;
                }
                
                .nav-links a {
                    padding: 6px 12px;
                    font-size: 12px;
                }
                
                .admin-header {
                    flex-direction: column;
                    gap: 15px;
                    text-align: center;
                }
                
                .search-box {
                    width: 100%;
                }
                
                table {
                    display: block;
                    overflow-x: auto;
                }
                
                .user-actions {
                    flex-direction: column;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">
                <h1>🔐 Admin Panel</h1>
            </div>
            <div class="nav-links">
                <a href="/">🏠 Home</a>
                <a href="/admin/users" class="active">👥 Users</a>
                <a href="/admin/devices">📱 Devices</a>
                <a href="/admin/logs">📊 Logs</a>
            </div>
        </div>
        
        <div class="container">
            <div class="admin-header">
                <h1>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    User Management
                </h1>
                <div style="display: flex; gap: 15px;">
                    <button class="btn refresh-btn" onclick="loadUsers()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                            <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Refresh
                    </button>
                    <button class="btn export-btn" onclick="exportUsers()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>
            
            <div id="message" class="message"></div>
            
            <div class="stats-cards">
                <div class="stat-card">
                    <h3>Total Users</h3>
                    <div class="value" id="totalUsers">0</div>
                    <div class="sub-value" id="newUsersToday">0 new today</div>
                </div>
                <div class="stat-card">
                    <h3>Active Today</h3>
                    <div class="value" id="activeToday">0</div>
                    <div class="sub-value">Last 24 hours</div>
                </div>
                <div class="stat-card">
                    <h3>Average Age</h3>
                    <div class="value" id="avgAccountAge">0 days</div>
                    <div class="sub-value">Account duration</div>
                </div>
            </div>
            
            <div class="users-table-container">
                <div class="table-header">
                    <h2>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Registered Users
                    </h2>
                    <div class="search-box">
                        <div class="search-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input type="text" id="searchInput" placeholder="Search users..." oninput="filterUsers()">
                    </div>
                </div>
                
                <div id="usersTable">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Loading users...</p>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            let allUsers = [];
            let currentPage = 1;
            const usersPerPage = 10;
            
            async function loadUsers() {
                try {
                    const response = await fetch('/api/auth/users');
                    const data = await response.json();
                    
                    if (data.success) {
                        allUsers = data.users;
                        updateStatistics(allUsers);
                        renderUsersTable(allUsers);
                        showMessage('Users loaded successfully', 'success');
                    } else {
                        showMessage('Failed to load users: ' + data.message, 'error');
                    }
                } catch (error) {
                    console.error('Error loading users:', error);
                    showMessage('Network error. Please try again.', 'error');
                }
            }
            
            function updateStatistics(users) {
                // Update total users
                document.getElementById('totalUsers').textContent = users.length;
                
                // Calculate new users today
                const today = new Date().toDateString();
                const newToday = users.filter(user => {
                    const userDate = new Date(user.createdAt).toDateString();
                    return userDate === today;
                }).length;
                document.getElementById('newUsersToday').textContent = newToday + ' new today';
                
                // Calculate active today (users with recent activity)
                const activeToday = users.filter(user => {
                    const updatedAt = new Date(user.updatedAt);
                    const hoursDiff = (new Date() - updatedAt) / (1000 * 60 * 60);
                    return hoursDiff < 24;
                }).length;
                document.getElementById('activeToday').textContent = activeToday;
                
                // Calculate average account age
                if (users.length > 0) {
                    const totalDays = users.reduce((sum, user) => {
                        const created = new Date(user.createdAt);
                        const daysDiff = (new Date() - created) / (1000 * 60 * 60 * 24);
                        return sum + daysDiff;
                    }, 0);
                    const avgDays = Math.round(totalDays / users.length);
                    document.getElementById('avgAccountAge').textContent = avgDays + ' days';
                }
            }
            
            function renderUsersTable(users) {
                const usersTable = document.getElementById('usersTable');
                
                if (users.length === 0) {
                    usersTable.innerHTML = '<div class="no-data"><svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 15px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg><h3>No users found</h3><p>No users have registered yet.</p></div>';
                    return;
                }
                
                // Calculate pagination
                const totalPages = Math.ceil(users.length / usersPerPage);
                const startIndex = (currentPage - 1) * usersPerPage;
                const endIndex = startIndex + usersPerPage;
                const pageUsers = users.slice(startIndex, endIndex);
                
                let tableHTML = '<table><thead><tr><th>ID</th><th>User</th><th>Contact</th><th>Registration Date</th><th>Account Age</th><th>Actions</th></tr></thead><tbody>';
                
                pageUsers.forEach(user => {
                    const createdAt = new Date(user.createdAt);
                    const accountAge = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));
                    
                    tableHTML += '<tr><td><div class="user-id">#' + user.id.substring(0, 8) + '...</div></td><td><div class="user-name"><div class="user-avatar">' + user.name.charAt(0).toUpperCase() + '</div><div><div style="font-weight: 600;">' + user.name + '</div><div class="status-badge status-active">Active</div></div></div></td><td><div class="user-email">' + user.email + '</div><div class="user-phone">' + (user.phone || 'Not provided') + '</div></td><td><div>' + createdAt.toLocaleDateString() + '</div><div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">' + createdAt.toLocaleTimeString() + '</div></td><td><div>' + accountAge + ' days</div><div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">' + formatTimeAgo(createdAt) + '</div></td><td><div class="user-actions"><button class="action-btn view" onclick="viewUserDetails(\\'' + user.id + '\\')">View</button><button class="action-btn delete" onclick="deleteUser(\\'' + user.id + '\\', \\'' + user.name + '\\')">Delete</button></div></td></tr>';
                });
                
                tableHTML += '</tbody></table>';
                
                // Add pagination
                if (totalPages > 1) {
                    tableHTML += '<div class="pagination">';
                    
                    tableHTML += '<button class="pagination-btn" onclick="changePage(' + (currentPage - 1) + ')" ' + (currentPage === 1 ? 'disabled style="opacity: 0.5;"' : '') + '>Previous</button>';
                    
                    for (let i = 1; i <= totalPages; i++) {
                        tableHTML += '<button class="pagination-btn ' + (i === currentPage ? 'active' : '') + '" onclick="changePage(' + i + ')">' + i + '</button>';
                    }
                    
                    tableHTML += '<button class="pagination-btn" onclick="changePage(' + (currentPage + 1) + ')" ' + (currentPage === totalPages ? 'disabled style="opacity: 0.5;"' : '') + '>Next</button></div>';
                }
                
                usersTable.innerHTML = tableHTML;
            }
            
            function filterUsers() {
                const searchTerm = document.getElementById('searchInput').value.toLowerCase();
                
                if (searchTerm === '') {
                    renderUsersTable(allUsers);
                    return;
                }
                
                const filteredUsers = allUsers.filter(user => 
                    user.name.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    (user.phone && user.phone.toLowerCase().includes(searchTerm)) ||
                    user.id.toLowerCase().includes(searchTerm)
                );
                
                renderUsersTable(filteredUsers);
            }
            
            function changePage(page) {
                const totalPages = Math.ceil(allUsers.length / usersPerPage);
                
                if (page < 1 || page > totalPages) return;
                
                currentPage = page;
                renderUsersTable(allUsers);
                
                // Scroll to top of table
                document.querySelector('.users-table-container').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }
            
            function formatTimeAgo(date) {
                const seconds = Math.floor((new Date() - date) / 1000);
                
                if (seconds < 60) return 'just now';
                
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return minutes + 'm ago';
                
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return hours + 'h ago';
                
                const days = Math.floor(hours / 24);
                if (days < 7) return days + 'd ago';
                
                const weeks = Math.floor(days / 7);
                if (weeks < 4) return weeks + 'w ago';
                
                const months = Math.floor(days / 30);
                if (months < 12) return months + 'mo ago';
                
                const years = Math.floor(days / 365);
                return years + 'y ago';
            }
            
            function viewUserDetails(userId) {
                const user = allUsers.find(u => u.id === userId);
                if (user) {
                    const details = 'Name: ' + user.name + '\\nEmail: ' + user.email + '\\nPhone: ' + (user.phone || 'Not provided') + '\\nUser ID: ' + user.id + '\\nRegistered: ' + new Date(user.createdAt).toLocaleString() + '\\nLast Updated: ' + new Date(user.updatedAt).toLocaleString();
                    alert(details);
                }
            }
            
            function deleteUser(userId, userName) {
                if (confirm('Are you sure you want to delete user "' + userName + '"? This action cannot be undone.')) {
                    // Note: In a real application, you would make an API call to delete the user
                    // For this demo, we'll just remove from the frontend array and refresh
                    const userIndex = allUsers.findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        allUsers.splice(userIndex, 1);
                        updateStatistics(allUsers);
                        renderUsersTable(allUsers);
                        showMessage('User "' + userName + '" deleted successfully', 'success');
                    }
                }
            }
            
            function exportUsers() {
                if (allUsers.length === 0) {
                    showMessage('No users to export', 'error');
                    return;
                }
                
                // Create CSV content
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "ID,Name,Email,Phone,Registration Date,Account Age (days)\\n";
                
                allUsers.forEach(user => {
                    const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
                    const row = [
                        user.id,
                        '"' + user.name + '"',
                        user.email,
                        user.phone || '',
                        new Date(user.createdAt).toISOString(),
                        accountAge
                    ].join(',');
                    csvContent += row + "\\n";
                });
                
                // Create download link
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "users_" + new Date().toISOString().split('T')[0] + ".csv");
                document.body.appendChild(link);
                
                // Trigger download
                link.click();
                document.body.removeChild(link);
                
                showMessage('Users exported successfully', 'success');
            }
            
            function showMessage(text, type) {
                const messageEl = document.getElementById('message');
                messageEl.textContent = text;
                messageEl.className = 'message ' + type;
                
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 5000);
            }
            
            // Load users on page load
            window.addEventListener('load', loadUsers);
            
            // Auto-refresh every 30 seconds
            setInterval(loadUsers, 30000);
        </script>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(adminHTML);
});

// Trang đăng nhập admin (nếu muốn bảo mật)
app.get('/admin/login', (req, res) => {
    const adminLoginHTML = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Login</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .login-container {
                background: rgba(31, 41, 55, 0.9);
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                padding: 40px;
                width: 100%;
                max-width: 400px;
                border: 1px solid #374151;
                backdrop-filter: blur(10px);
            }
            
            .logo {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .logo h1 {
                color: #60a5fa;
                font-size: 28px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
            
            .logo p {
                color: #9ca3af;
                font-size: 14px;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #d1d5db;
                font-weight: 500;
            }
            
            .form-group input {
                width: 100%;
                padding: 12px 16px;
                background: #111827;
                border: 1px solid #374151;
                border-radius: 10px;
                color: white;
                font-size: 16px;
                transition: all 0.3s;
            }
            
            .form-group input:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .btn {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                margin-top: 10px;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
            }
            
            .back-link {
                text-align: center;
                margin-top: 20px;
            }
            
            .back-link a {
                color: #60a5fa;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            
            .message {
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
                display: none;
            }
            
            .message.success {
                background: rgba(34, 197, 94, 0.1);
                color: #4ade80;
                border: 1px solid rgba(34, 197, 94, 0.3);
                display: block;
            }
            
            .message.error {
                background: rgba(239, 68, 68, 0.1);
                color: #f87171;
                border: 1px solid rgba(239, 68, 68, 0.3);
                display: block;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="logo">
                <h1>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Admin Access
                </h1>
                <p>Restricted area - Admin login only</p>
            </div>
            
            <div id="message" class="message"></div>
            
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" placeholder="Enter admin username">
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="Enter admin password">
            </div>
            
            <button class="btn" onclick="adminLogin()">Login as Admin</button>
            
            <div class="back-link">
                <a href="/">← Back to Home</a>
            </div>
        </div>
        
        <script>
            function showMessage(text, type) {
                const messageEl = document.getElementById('message');
                messageEl.textContent = text;
                messageEl.className = 'message ' + type;
            }
            
            function adminLogin() {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                // For demo purposes - In production, use proper authentication
                if (username === 'admin' && password === 'admin123') {
                    showMessage('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/admin/users';
                    }, 1000);
                } else {
                    showMessage('Invalid username or password', 'error');
                }
            }
            
            // Allow form submission with Enter key
            document.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    adminLogin();
                }
            });
            
            // For demo, auto-fill credentials
            window.addEventListener('load', () => {
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = 'admin123';
            });
        </script>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(adminLoginHTML);
});

// ==================== AUTH ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        console.log('📝 [BACKEND] Register request for: ' + email);
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }
        
        // Validate email is @gmail.com
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Only Gmail addresses are allowed (example@gmail.com)'
            });
        }
        
        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Create new user (in production, hash password!)
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            phone: phone || '',
            password: password, // WARNING: In production, hash this!
            settings: {
                darkMode: false,
                notifications: true,
                energySaving: true,
                language: 'en'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        console.log('✅ [BACKEND] User created: ' + email + ' (Total users: ' + users.length + ')');
        
        // Return user without password
        const userResponse = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            settings: newUser.settings,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt
        };
        
        // Simple token for demo
        const token = 'demo_jwt_token_' + Date.now();
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userResponse,
            token,
            expiresIn: 604800 // 7 days
        });
        
    } catch (error) {
        console.error('❌ [BACKEND] Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
});

// Login user với username support
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔐 [BACKEND] Login attempt for: ' + username);
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        // Find user - kiểm tra cả username và email
        const user = users.find(u => {
            // Tạo username từ tên (remove spaces, lowercase)
            const userName = u.name.toLowerCase().replace(/\s+/g, '');
            return userName === username.toLowerCase() || 
                   u.email === username ||
                   u.name.toLowerCase() === username.toLowerCase();
        });
        
        if (!user) {
            console.log('❌ [BACKEND] User not found: ' + username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        // Check password (in production, use bcrypt)
        if (user.password !== password) {
            console.log('❌ [BACKEND] Invalid password for: ' + username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        // Update last login
        user.updatedAt = new Date().toISOString();
        
        // Return user without password
        const userResponse = {
            id: user.id,
            name: user.name,
            username: user.name.toLowerCase().replace(/\s+/g, ''), // Tạo username từ name
            email: user.email,
            phone: user.phone,
            settings: user.settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        
        // Simple token for demo
        const token = 'demo_jwt_token_' + Date.now();
        
        console.log('✅ [BACKEND] Login successful: ' + username);
        
        res.json({
            success: true,
            message: 'Login successful',
            user: userResponse,
            token,
            expiresIn: 604800
        });
        
    } catch (error) {
        console.error('❌ [BACKEND] Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
});

// Get user profile
app.get('/api/auth/profile', (req, res) => {
    try {
        console.log('👤 [BACKEND] Profile request');
        
        // Get token from header (simplified for demo)
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        }
        
        // For demo, check if we have any users
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No user found'
            });
        }
        
        // Extract token (remove "Bearer " prefix if present)
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        
        // Find user (in real app, verify JWT token)
        // For demo, we'll just return the first user
        const user = users[0];
        const userResponse = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            settings: user.settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        
        res.json({
            success: true,
            user: userResponse
        });
        
    } catch (error) {
        console.error('❌ [BACKEND] Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get all users (for debugging)
app.get('/api/auth/users', (req, res) => {
    res.json({
        success: true,
        count: users.length,
        users: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt
        }))
    });
});

// ==================== DEVICE ROUTES ====================

// Get all devices
app.get('/api/devices', (req, res) => {
    res.json(devices);
});

// Add new device
app.post('/api/devices', (req, res) => {
    try {
        const { name, type, room, power, status } = req.body;
        
        console.log('➕ [BACKEND] Add device request:', { name, type, room });
        
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
            status: status || 'Off',
            room,
            power: power || 0,
            lastActivity: new Date().toISOString()
        };
        
        devices.push(newDevice);
        
        // Emit socket event
        io.emit('deviceAdded', newDevice);
        io.emit('deviceListUpdated', { devices });
        
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

// Delete device
app.delete('/api/devices/:id', (req, res) => {
    try {
        const deviceId = req.params.id;
        
        console.log('🗑️ [BACKEND] Delete device request:', deviceId);
        
        const deviceIndex = devices.findIndex(d => d.id === deviceId);
        
        if (deviceIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
        
        const deletedDevice = devices.splice(deviceIndex, 1)[0];
        
        // Emit socket events
        io.emit('deviceDeleted', { deviceId });
        io.emit('deviceListUpdated', { devices });
        
        console.log('✅ [BACKEND] Device deleted: ' + deletedDevice.name + ' (Remaining devices: ' + devices.length + ')');
        
        res.json({
            success: true,
            message: 'Device deleted successfully',
            device: deletedDevice
        });
        
    } catch (error) {
        console.error('❌ [BACKEND] Delete device error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting device',
            error: error.message
        });
    }
});

// Toggle device
app.post('/api/devices/toggle', (req, res) => {
    const { deviceId, state } = req.body;
    console.log('🔄 [BACKEND] Toggle device ' + deviceId + ' to ' + state);
    
    // Update device status
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
        devices[deviceIndex].status = state ? 'On' : 'Off';
        devices[deviceIndex].lastActivity = new Date().toISOString();
    }
    
    res.json({
        success: true,
        message: 'Device ' + deviceId + ' toggled to ' + (state ? 'ON' : 'OFF'),
        deviceId,
        state
    });
});

// ==================== SCHEDULES ROUTES ====================

// Get all schedules
app.get('/api/schedules', (req, res) => {
  try {
    console.log('📅 [BACKEND] Get all schedules request');
    
    res.json({
      success: true,
      count: schedules.length,
      schedules: schedules.map(s => ({
        id: s.id,
        deviceId: s.deviceId,
        deviceType: s.deviceType,
        location: s.location,
        timeOn: s.timeOn,
        timeOff: s.timeOff,
        note: s.note,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    });
    
  } catch (error) {
    console.error('❌ [BACKEND] Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching schedules'
    });
  }
});

// Get schedule by ID
app.get('/api/schedules/:id', (req, res) => {
  try {
    const scheduleId = req.params.id;
    console.log(`📅 [BACKEND] Get schedule request: ${scheduleId}`);
    
    const schedule = schedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      schedule
    });
    
  } catch (error) {
    console.error('❌ [BACKEND] Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching schedule'
    });
  }
});

// Create new schedule
app.post('/api/schedules', (req, res) => {
  try {
    const { deviceId, deviceName, deviceType, location, timeOn, timeOff, note } = req.body;
    
    console.log('📅 [BACKEND] Create schedule request:', { deviceId, deviceName, deviceType });
    
    if (!deviceId || !deviceName || !deviceType || !location || !timeOn) {
      return res.status(400).json({
        success: false,
        message: 'Device ID, name, type, location, and timeOn are required'
      });
    }
    
    // Create new schedule
    const newSchedule = {
      id: Date.now().toString(),
      deviceId,
      deviceName,
      deviceType,
      location,
      timeOn,
      timeOff: timeOff || null,
      note: note || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    schedules.push(newSchedule);
    
    console.log(`✅ [BACKEND] Schedule created: ${newSchedule.id} (Total: ${schedules.length})`);
    
    // Emit socket event for real-time updates
    io.emit('scheduleAdded', newSchedule);
    
    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      schedule: newSchedule
    });
    
  } catch (error) {
    console.error('❌ [BACKEND] Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating schedule'
    });
  }
});

// Update schedule
app.put('/api/schedules/:id', (req, res) => {
  try {
    const scheduleId = req.params.id;
    const updates = req.body;
    
    console.log(`📅 [BACKEND] Update schedule request: ${scheduleId}`);
    
    const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    // Update schedule
    schedules[scheduleIndex] = {
      ...schedules[scheduleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    console.log(`✅ [BACKEND] Schedule updated: ${scheduleId}`);
    
    // Emit socket event
    io.emit('scheduleUpdated', schedules[scheduleIndex]);
    
    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: schedules[scheduleIndex]
    });
    
  } catch (error) {
    console.error('❌ [BACKEND] Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating schedule'
    });
  }
});

// Delete schedule
app.delete('/api/schedules/:id', (req, res) => {
  try {
    const scheduleId = req.params.id;
    
    console.log(`📅 [BACKEND] Delete schedule request: ${scheduleId}`);
    
    const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    const deletedSchedule = schedules.splice(scheduleIndex, 1)[0];
    
    console.log(`✅ [BACKEND] Schedule deleted: ${scheduleId} (Remaining: ${schedules.length})`);
    
    // Emit socket event
    io.emit('scheduleDeleted', { scheduleId });
    
    res.json({
      success: true,
      message: 'Schedule deleted successfully',
      schedule: deletedSchedule
    });
    
  } catch (error) {
    console.error('❌ [BACKEND] Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting schedule'
    });
  }
});

// Toggle schedule status
app.post('/api/schedules/:id/toggle', (req, res) => {
  try {
    const scheduleId = req.params.id;
    const { isActive } = req.body;
    
    console.log(`📅 [BACKEND] Toggle schedule request: ${scheduleId} to ${isActive}`);
    
    const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
    
    if (scheduleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    schedules[scheduleIndex].isActive = isActive;
    schedules[scheduleIndex].updatedAt = new Date().toISOString();
    
    console.log(`✅ [BACKEND] Schedule toggled: ${scheduleId} -> ${isActive ? 'Active' : 'Inactive'}`);
    
    // Emit socket event
    io.emit('scheduleUpdated', schedules[scheduleIndex]);
    
    res.json({
      success: true,
      message: `Schedule ${isActive ? 'activated' : 'deactivated'} successfully`,
      schedule: schedules[scheduleIndex]
    });
    
  } catch (error) {
    console.error('❌ [BACKEND] Toggle schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling schedule'
    });
  }
});

// ==================== SCHEDULE EXECUTION ====================

// Function to check and execute schedules
function checkSchedules() {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    schedules.forEach(schedule => {
      if (!schedule.isActive) return;
      
     // Check if it's time to turn on
if (schedule.timeOn === currentTime) {
  console.log(`⏰ [SCHEDULER] Executing schedule ${schedule.id}: Turning ON ${schedule.deviceName} in ${schedule.location}`);
  
  // Find the device
  const deviceIndex = devices.findIndex(d => d.id === schedule.deviceId);
  if (deviceIndex !== -1) {
    devices[deviceIndex].status = 'On';
    devices[deviceIndex].lastActivity = new Date().toISOString();
    
    // Emit socket event
    io.emit('deviceUpdated', {
      deviceId: schedule.deviceId,
      state: true,
      timestamp: new Date().toISOString(),
      triggeredBy: 'schedule',
      deviceName: schedule.deviceName,
      location: schedule.location
    });
    
    io.emit('scheduleExecuted', {
      scheduleId: schedule.id,
      deviceId: schedule.deviceId,
      deviceName: schedule.deviceName,
      action: 'turnOn',
      timestamp: new Date().toISOString()
    });
  }
}
      
      // Check if it's time to turn off
      if (schedule.timeOff && schedule.timeOff === currentTime) {
        console.log(`⏰ [SCHEDULER] Executing schedule ${schedule.id}: Turning OFF device ${schedule.deviceId}`);
        
        // Find the device
        const deviceIndex = devices.findIndex(d => d.id === schedule.deviceId);
        if (deviceIndex !== -1) {
          devices[deviceIndex].status = 'Off';
          devices[deviceIndex].lastActivity = new Date().toISOString();
          
          // Emit socket event
          io.emit('deviceUpdated', {
            deviceId: schedule.deviceId,
            state: false,
            timestamp: new Date().toISOString(),
            triggeredBy: 'schedule'
          });
          
          io.emit('scheduleExecuted', {
            scheduleId: schedule.id,
            deviceId: schedule.deviceId,
            action: 'turnOff',
            timestamp: new Date().toISOString()
          });
        }
      }
    });
  } catch (error) {
    console.error('❌ [SCHEDULER] Error checking schedules:', error);
  }
}

// Start schedule checker (runs every minute)
setInterval(checkSchedules, 60000);

// Also check immediately on startup
setTimeout(checkSchedules, 1000);

// ==================== ANALYTICS ROUTES ====================

app.get('/api/analytics/dashboard', (req, res) => {
    res.json({
        success: true,
        data: {
            summary: {
                totalDevices: devices.length,
                activeDevices: devices.filter(d => d.status === 'On').length,
                inactiveDevices: devices.filter(d => d.status === 'Off').length,
                activePercentage: devices.length > 0 ? Math.round((devices.filter(d => d.status === 'On').length / devices.length) * 100) : 0
            },
            activity: {
                total: 156,
                comparison: -23,
                activeDevices: devices.filter(d => d.status === 'On').length
            },
            timestamp: new Date().toISOString()
        }
    });
});

app.get('/api/analytics/real-time', (req, res) => {
    res.json({
        success: true,
        data: {
            timestamp: new Date().toISOString(),
            currentActivity: Math.floor(Math.random() * 20) + 10,
            totalActivity: 234,
            activeDevices: devices.filter(d => d.status === 'On').length,
            energySaved: parseFloat((Math.random() * 5 + 18).toFixed(2))
        }
    });
});

// ==================== HEALTH ROUTE ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            api: 'running',
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            users_count: users.length,
            devices_count: devices.length,
            schedules_count: schedules.length,
            scheduler: 'active'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
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
⏰ Scheduler:  Active (60s interval)
💚 Health:     http://localhost:${PORT}/health
👥 Admin:      http://localhost:${PORT}/admin/users
🔐 Admin Login: http://localhost:${PORT}/admin/login
============================================================
✅ Full stack application ready!
============================================================
    `);
});