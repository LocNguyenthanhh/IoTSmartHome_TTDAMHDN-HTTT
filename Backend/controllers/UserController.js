// Backend/controllers/UserController.js
const User = require("../models/User");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // KHAI BÁO DUY NHẤT TẠI ĐÂY

const generateSimpleToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);


// 1. Đăng ký (Register)
// 1. Đăng ký (Register)
exports.register = async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;

        // 1. Kiểm tra dữ liệu bắt buộc
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
        }
        
        // --- THÊM LOGIC KIỂM TRA ĐUÔI EMAIL GMAIL TẠI ĐÂY ---
        const gmailRegex = /@gmail\.com$/i; 
        if (!gmailRegex.test(email)) {
            return res.status(400).json({ message: "Email bắt buộc phải có đuôi @gmail.com!" });
        }
        // ---------------------------------------------------

        // 2. Kiểm tra trùng email
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ message: "Email này đã được sử dụng!" });
        }

        // 3. Tạo user (Dùng mật khẩu thô như đã fix)
        const rawPassword = password; 

        const newUser = new User({
            User_name: username,
            email: email,
            Password: rawPassword, // LƯU MẬT KHẨU THÔ
            Phone_No: phone || ""
        });

        await newUser.save();

        res.status(201).json({ message: "Đăng ký thành công!" });

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Lỗi Server: " + err.message });
    }
};

// 2. Đăng nhập (Login)
exports.login = async (req, res) => {
    try {
        // --- SỬA 1: Thay email bằng username ---
        const { username, password } = req.body; 

        // --- SỬA 2: Tìm user theo User_name ---
        const user = await User.findOne({ User_name: username });
        if (!user) {
            // --- SỬA 3: Cập nhật thông báo lỗi ---
            return res.status(400).json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        // So sánh mật khẩu thô
        const isMatch = (password === user.Password);
        
        if (!isMatch) {
            // --- SỬA 3: Cập nhật thông báo lỗi ---
            return res.status(400).json({ message: "Sai tên đăng nhập hoặc mật khẩu!" });
        }

        // Tạo Token (Giữ nguyên)
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || "secret_key_tam_thoi",
            { expiresIn: "1d" }
        );

        // Trả về thông tin user (Giữ nguyên)
        res.json({
            message: "Đăng nhập thành công",
            token: token,
            user: {
                id: user._id,
                name: user.User_name,
                email: user.email,
                phone: user.Phone_No,
                avatar: user.User_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// 3. Quên mật khẩu (Forgot Password)
// 3. Quên mật khẩu (Forgot Password)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });
        }

        // Tạo token ngẫu nhiên (dùng hàm đơn giản)
        const token = generateSimpleToken(); // Sử dụng hàm đã định nghĩa
        
        // Lưu token vào DB (Hết hạn sau 1 giờ)
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Link giả lập in ra console (giữ nguyên)
        const resetLink = `http://127.0.0.1:5000/reset-password/${token}`;
        console.log("========================================");
        console.log("LINK RESET PASSWORD (Giả lập Email):");
        console.log(resetLink);
        console.log("========================================");

        // --- ĐIỀU CHỈNH: TRẢ VỀ TOKEN ĐỂ FRONTEND CHUYỂN HƯỚNG ---
        res.json({ 
            message: "Mã token đã được tạo.", 
            token: token // TRẢ VỀ TOKEN ĐỂ FRONTEND DÙNG ĐỂ CHUYỂN HƯỚNG
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. Đặt lại mật khẩu mới (Reset Password)
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        // Tìm user có token khớp và chưa hết hạn
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
        }

        // XÓA MÃ HÓA: Gán mật khẩu thô mới
        user.Password = newPassword; 

        // Xóa token
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ message: "Đổi mật khẩu thành công! Hãy đăng nhập lại." });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 5. Đổi mật khẩu (FINAL VERSION - Có Log Debug)
exports.changePassword = async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        console.log(`--> [API] Nhận yêu cầu đổi pass cho User ID: ${userId}`);

        // 1. Tìm user bằng ID
        const user = await User.findById(userId);
        if (!user) {
            console.log("--> [API] Lỗi: Không tìm thấy User!");
            return res.status(404).json({ message: "Người dùng không tồn tại!" });
        }

        // 2. SỬA: Kiểm tra mật khẩu cũ bằng so sánh chuỗi thô
        const isMatch = (currentPassword === user.Password);
        
        if (!isMatch) {
            console.log("--> [API] Lỗi: Mật khẩu cũ sai!");
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng!" });
        }

        // 3. Gán mật khẩu mới (Lưu thô)
        console.log("--> [API] Mật khẩu cũ đúng. Đang lưu mật khẩu mới...");
        user.Password = newPassword;
        await user.save();

        console.log("--> [API] THÀNH CÔNG: Đã lưu vào DB!");
        res.json({ message: "Đổi mật khẩu thành công!" });

    } catch (err) {
        console.error("--> [API] LỖI SERVER:", err);
        res.status(500).json({ message: "Lỗi Server: " + err.message });
    }
};
// 6. Các hàm CRUD cũ (Lấy danh sách, cập nhật, xóa)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await User.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Alias cho route cũ nếu cần
exports.createUser = exports.register;