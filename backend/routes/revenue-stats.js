import { Router } from "express";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";

const router = Router();

// Middleware admin key
const requireAdminKey = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return next();
  }
  
  const headerKey = req.headers["x-admin-key"];
  if (headerKey !== adminKey) {
    return res.status(401).json({ message: "Không có quyền admin" });
  }
  return next();
};

// Giá gói (VND) - theo định nghĩa từ payment system
const PACKAGE_PRICES = {
  day: 29000,     // 29k VND
  month: 149000,  // 149k VND  
  year: 1390000   // 1.390k VND
};

// Lấy thống kê doanh thu tổng quan
router.get("/overview", requireAdminKey, async (req, res) => {
  try {
    // Thống kê từ PaymentTransaction với status 'paid' (thành công)
    const paymentStats = await PaymentTransaction.aggregate([
      { $match: { status: 'paid' } }, // Chỉ lấy giao dịch thành công
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          users: { $addToSet: '$user' } // Đếm unique users
        }
      }
    ]);

    // Tính tổng doanh thu và giao dịch
    let totalRevenue = 0;
    let totalTransactions = 0;
    const allUsers = new Set();

    // Khởi tạo dữ liệu cho từng gói
    const revenueByPackage = {
      day: { count: 0, revenue: 0, price: PACKAGE_PRICES.day, users: [] },
      month: { count: 0, revenue: 0, price: PACKAGE_PRICES.month, users: [] },
      year: { count: 0, revenue: 0, price: PACKAGE_PRICES.year, users: [] }
    };

    // Xử lý kết quả aggregation
    for (const stat of paymentStats) {
      const plan = stat._id;
      if (revenueByPackage[plan]) {
        revenueByPackage[plan].count = stat.count;
        revenueByPackage[plan].revenue = stat.totalAmount;
        
        totalRevenue += stat.totalAmount;
        totalTransactions += stat.count;
        
        // Thêm users vào set để đếm unique
        stat.users.forEach(user => allUsers.add(user.toString()));
      }
    }

    // Lấy thông tin chi tiết user cho từng gói
    for (const plan of ['day', 'month', 'year']) {
      const transactions = await PaymentTransaction.find({
        status: 'paid',
        plan: plan
      }).populate('user', 'username email membershipExpiresAt').lean();

      // Nhóm theo user và tính tổng cho mỗi user
      const userMap = new Map();
      
      for (const trx of transactions) {
        const userId = trx.user._id.toString();
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            username: trx.user.username,
            email: trx.user.email,
            membershipExpiresAt: trx.user.membershipExpiresAt,
            purchaseCount: 0,
            revenue: 0,
            isActive: trx.user.membershipExpiresAt ? 
              new Date(trx.user.membershipExpiresAt) > new Date() : false
          });
        }
        
        const userData = userMap.get(userId);
        userData.purchaseCount += 1;
        userData.revenue += trx.amount;
      }
      
      revenueByPackage[plan].users = Array.from(userMap.values())
        .sort((a, b) => b.revenue - a.revenue); // Sắp xếp theo doanh thu giảm dần
    }

    res.json({
      overview: {
        totalRevenue: totalRevenue,
        totalUsers: allUsers.size,
        totalTransactions: totalTransactions,
        averageRevenuePerUser: allUsers.size > 0 ? Math.round(totalRevenue / allUsers.size) : 0
      },
      revenueByPackage: revenueByPackage
    });

  } catch (error) {
    console.error("Revenue overview error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Lấy danh sách user theo gói cụ thể
router.get("/users/:packageType", requireAdminKey, async (req, res) => {
  try {
    const { packageType } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!PACKAGE_PRICES[packageType]) {
      return res.status(400).json({ message: "Loại gói không hợp lệ" });
    }

    // Lấy tất cả giao dịch thành công cho gói này
    const transactions = await PaymentTransaction.find({
      status: 'paid',
      plan: packageType
    }).populate('user', 'username email membershipExpiresAt createdAt').lean();

    // Nhóm theo user
    const userMap = new Map();
    
    for (const trx of transactions) {
      if (!trx.user) continue; // Skip nếu user đã bị xóa
      
      const userId = trx.user._id.toString();
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          username: trx.user.username,
          email: trx.user.email,
          membershipLevel: packageType,
          membershipExpiresAt: trx.user.membershipExpiresAt,
          purchaseCount: 0,
          revenue: 0,
          createdAt: trx.user.createdAt,
          isActive: trx.user.membershipExpiresAt ? 
            new Date(trx.user.membershipExpiresAt) > new Date() : false,
          lastPurchase: trx.createdAt
        });
      }
      
      const userData = userMap.get(userId);
      userData.purchaseCount += 1;
      userData.revenue += trx.amount;
      
      // Cập nhật ngày mua gần nhất
      if (new Date(trx.createdAt) > new Date(userData.lastPurchase)) {
        userData.lastPurchase = trx.createdAt;
      }
    }

    // Chuyển thành array và sắp xếp
    const allUsers = Array.from(userMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    // Phân trang
    const totalUsers = allUsers.length;
    const paginatedUsers = allUsers.slice(skip, skip + limit);

    res.json({
      packageType: packageType,
      packagePrice: PACKAGE_PRICES[packageType],
      users: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers: totalUsers,
        hasNext: page < Math.ceil(totalUsers / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Users by package error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Thống kê doanh thu theo thời gian
router.get("/timeline", requireAdminKey, async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year
    
    let groupByFormat;
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        groupByFormat = "%Y-%m-%d";
        startDate.setDate(startDate.getDate() - 30); // 30 ngày gần đây
        break;
      case 'week':
        groupByFormat = "%Y-%U"; // Year-Week
        startDate.setDate(startDate.getDate() - 84); // 12 tuần gần đây  
        break;
      case 'month':
        groupByFormat = "%Y-%m";
        startDate.setMonth(startDate.getMonth() - 12); // 12 tháng gần đây
        break;
      case 'year':
        groupByFormat = "%Y";
        startDate.setFullYear(startDate.getFullYear() - 5); // 5 năm gần đây
        break;
      default:
        groupByFormat = "%Y-%m";
        startDate.setMonth(startDate.getMonth() - 12);
    }

    // Thống kê từ payment transactions chỉ với status 'paid'
    const timelineStats = await PaymentTransaction.aggregate([
      {
        $match: {
          status: 'paid', // Chỉ lấy giao dịch thành công
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            period: {
              $dateToString: {
                format: groupByFormat,
                date: "$createdAt"
              }
            },
            plan: '$plan'
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.period',
          plans: {
            $push: {
              plan: '$_id.plan',
              count: '$count',
              revenue: '$revenue'
            }
          },
          totalCount: { $sum: '$count' },
          totalRevenue: { $sum: '$revenue' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period: period,
      timeline: timelineStats.map(stat => ({
        period: stat._id,
        totalRevenue: stat.totalRevenue,
        totalTransactions: stat.totalCount,
        breakdown: stat.plans.reduce((acc, plan) => {
          acc[plan.plan] = {
            count: plan.count,
            revenue: plan.revenue
          };
          return acc;
        }, {})
      }))
    });

  } catch (error) {
    console.error("Revenue timeline error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

export default router;