const express = require("express");
const router = express.Router();
const Device = require("../models/Device");
const Dialog = require("../models/Dialog");
const EnergyLog = require("../models/EnergyLog");

// GET /api/analytics/dashboard - Dashboard tổng quan
router.get("/dashboard", async (req, res) => {
  try {
    // Tổng số devices
    const totalDevices = await Device.countDocuments();
    
    // Devices đang hoạt động
    const activeDevices = await Device.countDocuments({ Device_status: "On" });
    
    // Lịch sử activities gần đây
    const recentActivities = await Dialog.find()
      .populate("DeviceID")
      .sort({ Time: -1 })
      .limit(5)
      .exec();

    // Phân loại devices theo type
    const devicesByType = await Device.aggregate([
      {
        $group: {
          _id: "$Type",
          count: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ["$Device_status", "On"] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Activity data (thay thế energy data)
    const activityData = await getActivityData("day");
    const totalActivity = activityData.reduce((sum, item) => sum + item.activityCount, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalDevices,
          activeDevices,
          inactiveDevices: totalDevices - activeDevices,
          activePercentage: totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0
        },
        activity: {
          total: totalActivity,
          comparison: -15,
          activeDevices: activeDevices
        },
        devicesByType,
        recentActivities: recentActivities.map(activity => ({
          time: activity.Time,
          device: activity.DeviceID?.Device_name || "Unknown Device",
          action: activity.Action,
          status: activity.Status_history
        })),
        activityData: activityData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Analytics dashboard error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics data"
    });
  }
});

// GET /api/analytics/activity - Dữ liệu activity theo period
router.get("/activity", async (req, res) => {
  try {
    const { period = "day" } = req.query;
    
    const activityData = await getActivityData(period);
    const totalActivity = activityData.reduce((sum, item) => sum + item.activityCount, 0);
    
    res.json({
      success: true,
      data: {
        period,
        totalActivity: totalActivity,
        data: activityData,
        comparison: getRandomComparison()
      }
    });
  } catch (error) {
    console.error("Activity analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity data"
    });
  }
});

// GET /api/analytics/device-usage - Phân tích device usage
router.get("/device-usage", async (req, res) => {
  try {
    const deviceUsage = await Device.aggregate([
      {
        $lookup: {
          from: "dialogs",
          localField: "_id",
          foreignField: "DeviceID",
          as: "activities"
        }
      },
      {
        $project: {
          name: "$Device_name",
          type: "$Type",
          status: "$Device_status",
          room: "$RoomID",
          activityCount: { $size: "$activities" },
          lastActivity: { $max: "$activities.Time" }
        }
      },
      {
        $sort: { activityCount: -1 }
      }
    ]);

    // Tính phần trăm usage
    const totalActivities = deviceUsage.reduce((sum, device) => sum + device.activityCount, 0);
    const usageWithPercentage = deviceUsage.map(device => ({
      ...device,
      percentage: totalActivities > 0 ? Math.round((device.activityCount / totalActivities) * 100) : 0
    }));

    res.json({
      success: true,
      data: usageWithPercentage
    });
  } catch ( error) {
    console.error("Device usage analytics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch device usage data"
    });
  }
});

// GET /api/analytics/real-time - Dữ liệu real-time
router.get("/real-time", async (req, res) => {
  try {
    // Lấy trạng thái devices hiện tại
    const currentDevices = await Device.find()
      .populate("RoomID")
      .select("Device_name Type Device_status RoomID")
      .exec();

    // Lấy activities gần đây (5 phút)
    const recentActivities = await Dialog.find({
      Time: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    })
    .populate("DeviceID")
    .sort({ Time: -1 })
    .limit(10)
    .exec();

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        devices: currentDevices.map(device => ({
          id: device._id,
          name: device.Device_name,
          type: device.Type,
          status: device.Device_status,
          room: device.RoomID?.Room_name || "Unknown"
        })),
        activities: recentActivities.map(activity => ({
          time: activity.Time,
          device: activity.DeviceID?.Device_name || "Unknown",
          action: activity.Action,
          status: activity.Status_history
        })),
        summary: {
          totalDevices: currentDevices.length,
          activeDevices: currentDevices.filter(d => d.Device_status === "On").length,
          recentActivities: recentActivities.length
        }
      }
    });
  } catch (error) {
    console.error("Real-time data error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch real-time data"
    });
  }
});

// Helper functions
async function getActivityData(period = "day") {
  try {
    const activities = await Dialog.aggregate([
      {
        $match: {
          Time: {
            $gte: getStartDate(period)
          }
        }
      },
      {
        $group: {
          _id: getGrouping(period),
          activityCount: { $sum: 1 },
          activeDevices: {
            $sum: {
              $cond: [{ $regexMatch: { input: "$Status_history", regex: /On|Active/i } }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    return activities.map(item => ({
      label: getLabel(item._id, period),
      activityCount: item.activityCount,
      activeDevices: item.activeDevices
    }));
  } catch (error) {
    console.error("Error getting activity data:", error);
    return getMockActivityData(period);
  }
}

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case "today": return new Date(now.setHours(0, 0, 0, 0));
    case "week": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now.setHours(0, 0, 0, 0));
  }
}

function getGrouping(period) {
  switch (period) {
    case "today": return { $hour: "$Time" };
    case "week": return { $dayOfWeek: "$Time" };
    case "month": return { $dayOfMonth: "$Time" };
    default: return { $hour: "$Time" };
  }
}

function getLabel(id, period) {
  if (typeof id === 'number') {
    switch (period) {
      case "today": return `${id}:00`;
      case "week": return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][id - 1] || `Day ${id}`;
      case "month": return `Day ${id}`;
      default: return `${id}:00`;
    }
  }
  return id.toString();
}

function getMockActivityData(period) {
  const now = new Date();
  let dataPoints = [];
  
  switch (period) {
    case "today":
      for (let i = 0; i < 24; i++) {
        dataPoints.push({
          label: `${i}:00`,
          activityCount: Math.floor(Math.random() * 10) + 1,
          activeDevices: Math.floor(Math.random() * 5) + 1
        });
      }
      break;
    case "week":
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (let i = 0; i < 7; i++) {
        dataPoints.push({
          label: days[i],
          activityCount: Math.floor(Math.random() * 50) + 10,
          activeDevices: Math.floor(Math.random() * 8) + 2
        });
      }
      break;
    case "month":
      for (let i = 0; i < 4; i++) {
        dataPoints.push({
          label: `Week ${i + 1}`,
          activityCount: Math.floor(Math.random() * 200) + 50,
          activeDevices: Math.floor(Math.random() * 12) + 3
        });
      }
      break;
  }
  
  return dataPoints;
}

function getRandomComparison() {
  const comparisons = [-23, -15, -8, 5, 12, 18];
  return comparisons[Math.floor(Math.random() * comparisons.length)];
}

module.exports = router;