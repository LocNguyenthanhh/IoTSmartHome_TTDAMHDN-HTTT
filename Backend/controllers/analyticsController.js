// Backend/controllers/analyticsController.js

const Device = require('../models/Device');
const Dialog = require('../models/Dialog');

// Hàm chính để tính toán tổng quát
exports.getPowerAnalytics = async (req, res) => {
    try {
        // NHẬN THAM SỐ LỌC TỪ FRONTEND
        const { filter } = req.query; 
        
        // -----------------------------------------------------
        // 1. XÁC ĐỊNH PHẠM VI THỜI GIAN (CHO TÍNH NĂNG LỌC)
        // -----------------------------------------------------
        let startTimeFilter = null; // Nếu null, sẽ tính toán trọn đời (lifetime)

        if (filter === 'week') {
            const now = new Date();
            // Lấy thời điểm 7 ngày trước
            startTimeFilter = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); 
        } else if (filter === 'month') {
            const now = new Date();
            // Lấy thời điểm 30 ngày trước
            startTimeFilter = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); 
        }
        // Thêm các điều kiện khác (ví dụ: 'year', 'today') ở đây

        // -----------------------------------------------------
        // 2. LẤY DỮ LIỆU VÀ TÍNH TOÁN
        // -----------------------------------------------------

        const devices = await Device.find({});
        
        let totalEnergyConsumptionkWh = 0; 
        let currentRealTimePowerW = 0; 
        const currentTime = new Date().getTime();

        for (const device of devices) {
            const powerW = device.PowerConsumptionW || 60; 

            let runTimeMs = 0;
            
            // Nếu có tham số lọc (filter), chúng ta phải TÍNH TOÁN LẠI TỪ DIALOG
            if (startTimeFilter) {
                
                // Lấy tất cả sự kiện BẬT/TẮT cho thiết bị này trong phạm vi thời gian
                const history = await Dialog.find({
                    DeviceID: device._id,
                    Time: { $gte: startTimeFilter } 
                }).sort({ Time: 1 }); // Sắp xếp theo thứ tự thời gian tăng dần

                let lastOnTimeInPeriod = null;
                
                for (let i = 0; i < history.length; i++) {
                    const entry = history[i];
                    const entryTime = new Date(entry.Time);

                    if (entry.Status_history === 'ON') {
                        lastOnTimeInPeriod = entryTime;
                    } else if (entry.Status_history === 'OFF' && lastOnTimeInPeriod) {
                        // Tính toán thời gian chạy giữa lần ON và OFF
                        const duration = entryTime.getTime() - lastOnTimeInPeriod.getTime();
                        runTimeMs += duration;
                        lastOnTimeInPeriod = null; 
                    }
                }
                
                // Xử lý trường hợp thiết bị vẫn đang ON cho đến hiện tại
                // Điều kiện: thiết bị đang ON VÀ lần bật cuối cùng nằm trong phạm vi lọc
                if (device.Status && device.LastOnTime && new Date(device.LastOnTime).getTime() >= startTimeFilter.getTime()) {
                    const currentDurationMs = currentTime - new Date(device.LastOnTime).getTime();
                    runTimeMs += currentDurationMs;
                }

                // Nếu thiết bị đang BẬT, tính toán công suất Real-time
                if (device.Status) {
                    currentRealTimePowerW += powerW;
                }

            } else {
                // KHÔNG CÓ LỌC: Sử dụng giá trị TotalRunTimeMs (Trọn đời) đã được lưu trong Device Model
                
                runTimeMs = device.TotalRunTimeMs || 0;
                
                // Cộng thêm thời gian chạy hiện tại nếu đang ON
                if (device.Status && device.LastOnTime) {
                    const lastOnTimeMs = new Date(device.LastOnTime).getTime();
                    const currentDurationMs = currentTime - lastOnTimeMs;
                    runTimeMs += currentDurationMs;

                    currentRealTimePowerW += powerW;
                }
            }

            // Chuyển đổi runTimeMs (là tổng thời gian đã được lọc hoặc trọn đời) sang kWh
            const runTimeHours = runTimeMs / 3600000; // Chia cho milliseconds trong 1 giờ
            const deviceEnergykWh = (powerW * runTimeHours) / 1000; // (W * H) / 1000 = kWh
            
            totalEnergyConsumptionkWh += deviceEnergykWh;
        }

        // Trả về kết quả cho Frontend
        res.status(200).json({
            currentPowerW: parseFloat(currentRealTimePowerW.toFixed(2)),
            totalEnergykWh: parseFloat(totalEnergyConsumptionkWh.toFixed(4)), 
            timestamp: currentTime
        });

    } catch (error) {
        console.error('Lỗi khi tính toán Power Analytics:', error);
        res.status(500).json({ message: 'Lỗi server khi tính toán Power Analytics' });
    }
};