// Author: HinHin
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Home = require('../models/Home');

// Đăng ký tài khoản
exports.register = async (req, res) => {
    try {
        const { username, email, phone, password, name } = req.body;
        
        console.log('Register request:', { username, email, phone });
        
        // Kiểm tra các trường bắt buộc
        if (!username || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin (username, email, phone, password)'
            });
        }
        
        // Kiểm tra user đã tồn tại chưa
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }, { phone }] 
        });
        
        if (existingUser) {
            let field = '';
            if (existingUser.email === email) field = 'Email';
            else if (existingUser.username === username) field = 'Username';
            else field = 'Phone number';
            
            return res.status(400).json({
                success: false,
                message: `${field} đã được sử dụng`
            });
        }
        
        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Tạo home mới cho user
        const newHome = new Home({
            address: `${name}'s Home`,
            createdAt: new Date()
        });
        await newHome.save();
        
        // Tạo user mới
        const newUser = new User({
            username,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            User_name: name || username,
            HomeID: newHome._id
        });
        
        await newUser.save();
        
        // Tạo JWT token
        const token = jwt.sign(
            { 
                userId: newUser._id,
                username: newUser.username,
                email: newUser.email 
            },
            process.env.JWT_SECRET || 'your-jwt-secret-key-iot-smart-home-2025',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            data: {
                token,
                user: {
                    uid: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                    name: newUser.User_name,
                    phone: newUser.phone,
                    HomeID: newUser.HomeID,
                    avatar: newUser.User_name ? 
                        newUser.User_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
                        newUser.username.slice(0, 2).toUpperCase()
                }
            }
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
};

// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Login attempt for:', username);
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập username/email và mật khẩu'
            });
        }
        
        // Tìm user theo username hoặc email
        const user = await User.findOne({
            $or: [{ username }, { email: username.toLowerCase() }]
        });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại'
            });
        }
        
        // Kiểm tra mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu không chính xác'
            });
        }
        
        // Tạo JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                username: user.username,
                email: user.email 
            },
            process.env.JWT_SECRET || 'your-jwt-secret-key-iot-smart-home-2025',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    uid: user._id,
                    username: user.username,
                    email: user.email,
                    name: user.User_name,
                    phone: user.phone,
                    HomeID: user.HomeID,
                    avatar: user.User_name ? 
                        user.User_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
                        user.username.slice(0, 2).toUpperCase()
                }
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server: ' + error.message
        });
    }
};

// Lấy thông tin user hiện tại
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }
        
        res.json({
            success: true,
            data: {
                uid: user._id,
                username: user.username,
                email: user.email,
                name: user.User_name,
                phone: user.phone,
                HomeID: user.HomeID,
                avatar: user.User_name ? 
                    user.User_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
                    user.username.slice(0, 2).toUpperCase()
            }
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Quên mật khẩu
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email'
            });
        }
        
        // Tìm user bằng email
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email không tồn tại trong hệ thống'
            });
        }
        
        // Tạo reset token (trong thực tế nên gửi email)
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-jwt-secret-key-iot-smart-home-2025',
            { expiresIn: '1h' }
        );
        
        // TODO: Trong thực tế, gửi email chứa resetToken
        console.log(`Reset password token for ${email}: ${resetToken}`);
        
        res.json({
            success: true,
            message: 'Reset link đã được gửi đến email của bạn',
            data: {
                email: user.email,
                resetToken: resetToken // Chỉ trả về cho demo
            }
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// Reset mật khẩu
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token và mật khẩu mới là bắt buộc'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
            });
        }
        
        // Verify reset token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key-iot-smart-home-2025');
        
        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Cập nhật mật khẩu
        const user = await User.findByIdAndUpdate(
            decoded.userId,
            { password: hashedPassword },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }
        
        res.json({
            success: true,
            message: 'Mật khẩu đã được thay đổi thành công'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token đã hết hạn'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};