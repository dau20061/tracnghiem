import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import QuizResult from "../models/QuizResult.js";
import Quiz from "../models/Quiz.js";
import User from "../models/User.js";

const router = Router();

// Middleware xác thực
const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Thiếu token" });
    }
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (e) {
    console.error("Auth error", e.message);
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// Middleware admin (đơn giản hóa - kiểm tra admin key)
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

// Lưu kết quả làm bài
router.post("/submit", requireAuth, async (req, res) => {
  try {
    const { 
      quizId, 
      answers, // Array of { questionId, userAnswer, isCorrect, timeSpent }
      totalTimeSpent, 
      startedAt,
      sessionId // Thêm sessionId để track unique session
    } = req.body;

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Lấy thông tin quiz để có title
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Không tìm thấy quiz" });
    }

    // Tính điểm
    const score = answers.filter(answer => answer.isCorrect).length;
    const totalQuestions = answers.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    // Sử dụng findOneAndUpdate với upsert để tránh duplicate
    // Nếu có sessionId thì dùng nó, nếu không thì dùng thời gian
    let findCondition = {
      userId: req.userId,
      quizId: quizId
    };

    if (sessionId) {
      // Thêm sessionId vào condition nếu có
      findCondition.sessionId = sessionId;
    } else {
      // Fallback: tìm trong vòng 2 phút
      findCondition.completedAt = { $gte: new Date(Date.now() - 2 * 60 * 1000) };
    }
    
    const quizResult = await QuizResult.findOneAndUpdate(
      findCondition,
      {
        userId: req.userId,
        quizId: quizId,
        quizTitle: quiz.title,
        score: score,
        totalQuestions: totalQuestions,
        percentage: percentage,
        answers: answers,
        totalTimeSpent: totalTimeSpent || 0,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        completedAt: new Date(),
        status: 'completed',
        sessionId: sessionId || `fallback-${Date.now()}`
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    res.json({
      message: "Đã lưu kết quả",
      result: {
        id: quizResult._id,
        score: score,
        totalQuestions: totalQuestions,
        percentage: percentage,
        grade: quizResult.grade,
        timeSpent: quizResult.getFormattedTime()
      }
    });
  } catch (error) {
    console.error("Submit quiz result error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Lấy lịch sử làm bài của user
router.get("/history", requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Lấy kết quả với phân trang
    const results = await QuizResult
      .find({ userId: req.userId })
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Đếm tổng số bản ghi
    const total = await QuizResult.countDocuments({ userId: req.userId });

    // Format dữ liệu trả về
    const formattedResults = results.map(result => ({
      id: result._id,
      quizId: result.quizId,
      quizTitle: result.quizTitle,
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      grade: result.percentage >= 90 ? 'A' : 
             result.percentage >= 80 ? 'B' : 
             result.percentage >= 70 ? 'C' : 
             result.percentage >= 60 ? 'D' : 'F',
      totalTimeSpent: result.totalTimeSpent,
      formattedTime: `${Math.floor(result.totalTimeSpent / 60)}:${(result.totalTimeSpent % 60).toString().padStart(2, '0')}`,
      completedAt: result.completedAt,
      createdAt: result.createdAt
    }));

    res.json({
      results: formattedResults,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get quiz history error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Lấy thống kê tổng quan của user
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const stats = await QuizResult.getUserStats(req.userId);
    
    // Lấy thêm một số thống kê chi tiết
    const recentResults = await QuizResult
      .find({ userId: req.userId })
      .sort({ completedAt: -1 })
      .limit(5)
      .lean();

    // Thống kê theo quiz
    const quizStats = await QuizResult.aggregate([
      { $match: { userId: req.userId } },
      { 
        $group: {
          _id: "$quizId",
          quizTitle: { $first: "$quizTitle" },
          attempts: { $sum: 1 },
          bestScore: { $max: "$percentage" },
          avgScore: { $avg: "$percentage" },
          lastAttempt: { $max: "$completedAt" }
        }
      },
      { $sort: { lastAttempt: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      ...stats,
      recentResults: recentResults.map(result => ({
        quizTitle: result.quizTitle,
        percentage: result.percentage,
        completedAt: result.completedAt
      })),
      quizStats: quizStats.map(stat => ({
        quizId: stat._id,
        quizTitle: stat.quizTitle,
        attempts: stat.attempts,
        bestScore: Math.round(stat.bestScore),
        avgScore: Math.round(stat.avgScore),
        lastAttempt: stat.lastAttempt
      }))
    });
  } catch (error) {
    console.error("Get quiz stats error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Lấy chi tiết một kết quả cụ thể
router.get("/result/:resultId", requireAuth, async (req, res) => {
  try {
    const result = await QuizResult
      .findOne({ 
        _id: req.params.resultId, 
        userId: req.userId 
      })
      .lean();

    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy kết quả" });
    }

    // Format chi tiết câu trả lời
    const detailedResult = {
      ...result,
      grade: result.percentage >= 90 ? 'A' : 
             result.percentage >= 80 ? 'B' : 
             result.percentage >= 70 ? 'C' : 
             result.percentage >= 60 ? 'D' : 'F',
      formattedTime: `${Math.floor(result.totalTimeSpent / 60)}:${(result.totalTimeSpent % 60).toString().padStart(2, '0')}`,
      answers: result.answers.map(answer => ({
        ...answer,
        formattedTime: `${Math.floor(answer.timeSpent / 60)}:${(answer.timeSpent % 60).toString().padStart(2, '0')}`
      }))
    };

    res.json(detailedResult);
  } catch (error) {
    console.error("Get quiz result detail error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Xóa một kết quả
router.delete("/result/:resultId", requireAuth, async (req, res) => {
  try {
    const result = await QuizResult.findOneAndDelete({ 
      _id: req.params.resultId, 
      userId: req.userId 
    });

    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy kết quả" });
    }

    res.json({ message: "Đã xóa kết quả" });
  } catch (error) {
    console.error("Delete quiz result error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Thống kê theo khoảng thời gian
router.get("/stats/period", requireAuth, async (req, res) => {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 90d, 1y
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const periodStats = await QuizResult.aggregate([
      { 
        $match: { 
          userId: req.userId,
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$completedAt" 
            }
          },
          attempts: { $sum: 1 },
          avgScore: { $avg: "$percentage" },
          totalTime: { $sum: "$totalTimeSpent" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      period: period,
      stats: periodStats.map(stat => ({
        date: stat._id,
        attempts: stat.attempts,
        avgScore: Math.round(stat.avgScore),
        totalTime: stat.totalTime
      }))
    });
  } catch (error) {
    console.error("Get period stats error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// ==== ADMIN APIs ====

// Lấy lịch sử làm bài của một user cụ thể (dành cho admin)
router.get("/admin/:userId", requireAdminKey, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Kiểm tra user tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    // Lấy kết quả với phân trang
    const results = await QuizResult
      .find({ userId: userId })
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Đếm tổng số bản ghi
    const totalResults = await QuizResult.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalResults / limit);

    // Thống kê tổng quan
    const stats = await QuizResult.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          bestScore: { $max: "$percentage" },
          totalTimeSpent: { $sum: "$totalTimeSpent" }
        }
      }
    ]);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      results: results.map(result => ({
        id: result._id,
        quizId: result.quizId,
        quizTitle: result.quizTitle,
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        grade: result.percentage >= 90 ? 'A' : 
               result.percentage >= 80 ? 'B' : 
               result.percentage >= 70 ? 'C' : 
               result.percentage >= 60 ? 'D' : 'F',
        timeSpent: result.totalTimeSpent,
        completedAt: result.completedAt,
        status: result.status
      })),
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalResults: totalResults,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: stats.length > 0 ? {
        totalAttempts: stats[0].totalAttempts,
        averageScore: Math.round(stats[0].averageScore * 100) / 100,
        bestScore: Math.round(stats[0].bestScore * 100) / 100,
        totalTimeSpent: stats[0].totalTimeSpent
      } : {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeSpent: 0
      }
    });
  } catch (error) {
    console.error("Get user quiz results error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Xóa một kết quả làm bài cụ thể (dành cho admin)
router.delete("/admin/:resultId", requireAdminKey, async (req, res) => {
  try {
    const { resultId } = req.params;
    
    const result = await QuizResult.findByIdAndDelete(resultId);
    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy kết quả" });
    }

    res.json({ 
      message: "Đã xóa kết quả làm bài",
      deletedResult: {
        id: result._id,
        quizTitle: result.quizTitle,
        completedAt: result.completedAt
      }
    });
  } catch (error) {
    console.error("Delete quiz result error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Xóa tất cả lịch sử làm bài của một user (dành cho admin)
router.delete("/admin/user/:userId", requireAdminKey, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Kiểm tra user tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const deleteResult = await QuizResult.deleteMany({ userId: userId });
    
    res.json({ 
      message: `Đã xóa toàn bộ lịch sử làm bài của ${user.username}`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error("Delete all user quiz results error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

export default router;