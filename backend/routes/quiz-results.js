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

// ==== Helpers ====
const gradeFromPercentage = (percentage = 0) => {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
};

const formatDuration = (seconds = 0) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const normalizeCorrectMapping = (mapping) => {
  if (!mapping) return null;
  if (Array.isArray(mapping)) return mapping;
  if (mapping instanceof Map) {
    return Object.fromEntries(mapping.entries());
  }
  if (typeof mapping === "object") {
    return Object.keys(mapping).reduce((acc, key) => {
      acc[key] = mapping[key];
      return acc;
    }, {});
  }
  return null;
};

const sanitizeQuestion = (question) => {
  if (!question) return null;

  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    image: question.image || null,
    options: question.options || [],
    columns: question.columns || [],
    items: question.items || [],
    targets: question.targets || [],
    bank: question.bank || [],
    correct: question.correct,
    correctMapping: normalizeCorrectMapping(question.correctMapping),
    minCorrect: question.minCorrect,
    maxCorrect: question.maxCorrect,
  };
};

const buildDetailedResult = async (resultData) => {
  if (!resultData) return null;

  const plainResult = resultData.toObject ? resultData.toObject() : resultData;
  const quiz = await Quiz.findById(plainResult.quizId).lean();
  const questionMap = new Map();

  if (quiz?.questions?.length) {
    quiz.questions.forEach((question) => {
      questionMap.set(question.id, sanitizeQuestion(question));
    });
  }

  return {
    ...plainResult,
    id: plainResult._id || plainResult.id,
    quizMeta: quiz
      ? {
          id: quiz._id,
          title: quiz.title,
          questionCount: quiz.questions?.length || 0,
          settings: quiz.settings || {},
        }
      : null,
    grade: gradeFromPercentage(plainResult.percentage),
    formattedTime: formatDuration(plainResult.totalTimeSpent),
    answers: (plainResult.answers || []).map((answer) => ({
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
      isCorrect: answer.isCorrect,
      timeSpent: answer.timeSpent || 0,
      formattedTime: formatDuration(answer.timeSpent || 0),
      question: questionMap.get(answer.questionId) || null,
    })),
  };
};

// Lưu kết quả làm bài
router.post("/submit", requireAuth, async (req, res) => {
  try {
    const { 
      quizId, 
      answers, // Array of { questionId, userAnswer, isCorrect, timeSpent }
      totalTimeSpent, 
      startedAt,
      sessionId, // Thêm sessionId để track unique session
      isRetry, // Đánh dấu nếu đây là lần làm lại
      originalAttemptId, // ID của lần làm gốc nếu là retry
      hasTimeLimit // Flag từ frontend để biết quiz có giới hạn thời gian (mode: testing)
    } = req.body;

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Lấy thông tin quiz để có title
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Không tìm thấy quiz" });
    }

    // Check if quiz has time limit - use frontend flag or check quiz settings
    const hasTimeLimitFlag = hasTimeLimit || (quiz.settings?.timeLimit && quiz.settings.timeLimit > 0);
    
    // Get user to check remaining attempts
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    // If this is a retry, validate
    if (isRetry && originalAttemptId) {
      const originalAttempt = await QuizResult.findOne({
        _id: originalAttemptId,
        userId: req.userId,
        quizId: quizId
      });

      if (!originalAttempt) {
        return res.status(404).json({ message: "Không tìm thấy lần làm gốc" });
      }

      if (!originalAttempt.canRetry) {
        return res.status(400).json({ message: "Bài này không thể làm lại" });
      }

      if (originalAttempt.retriesUsed >= originalAttempt.maxRetries) {
        return res.status(400).json({ message: "Đã hết số lần làm lại" });
      }

      // Update original attempt's retry count
      originalAttempt.retriesUsed += 1;
      await originalAttempt.save();
    } else {
      // New attempt - deduct from remaining attempts
      if (user.remainingAttempts <= 0) {
        return res.status(403).json({ 
          message: "Bạn đã hết lượt làm bài. Vui lòng nâng cấp để tiếp tục.",
          code: "NO_ATTEMPTS"
        });
      }

      // Deduct one attempt
      user.remainingAttempts -= 1;
      await user.save();
    }

    // Tính điểm
    const score = answers.filter(answer => answer.isCorrect).length;
    const totalQuestions = answers.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    // Create new quiz result
    const quizResult = new QuizResult({
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
      sessionId: sessionId || `session-${Date.now()}`,
      canRetry: !hasTimeLimitFlag, // Cannot retry if quiz has time limit (testing mode)
      retriesUsed: 0,
      maxRetries: 5,
      originalAttemptId: isRetry ? originalAttemptId : null
    });

    await quizResult.save();

    res.json({
      message: "Đã lưu kết quả",
      result: {
        id: quizResult._id,
        score: score,
        totalQuestions: totalQuestions,
        percentage: percentage,
        grade: quizResult.grade,
        timeSpent: quizResult.getFormattedTime(),
        canRetry: quizResult.canRetry,
        retriesUsed: quizResult.retriesUsed,
        maxRetries: quizResult.maxRetries
      },
      remainingAttempts: user.remainingAttempts
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

    // Get user to include remaining attempts
    const user = await User.findById(req.userId);

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
      grade: gradeFromPercentage(result.percentage),
      totalTimeSpent: result.totalTimeSpent,
      formattedTime: `${Math.floor(result.totalTimeSpent / 60)}:${(result.totalTimeSpent % 60).toString().padStart(2, '0')}`,
      completedAt: result.completedAt,
      createdAt: result.createdAt,
      // Retry information
      canRetry: result.canRetry || false,
      retriesUsed: result.retriesUsed || 0,
      maxRetries: result.maxRetries || 5,
      canRetryNow: (result.canRetry && (result.retriesUsed || 0) < (result.maxRetries || 5))
    }));

    res.json({
      results: formattedResults,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      },
      remainingAttempts: user?.remainingAttempts || 0
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

    const detailedResult = await buildDetailedResult(result);
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

// Get user's remaining attempts
router.get("/attempts", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.json({
      remainingAttempts: user.remainingAttempts || 0,
      totalPurchasedAttempts: user.totalPurchasedAttempts || 0
    });
  } catch (error) {
    console.error("Get attempts error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Check if user can retry a specific quiz result
router.get("/can-retry/:resultId", requireAuth, async (req, res) => {
  try {
    const result = await QuizResult.findOne({
      _id: req.params.resultId,
      userId: req.userId
    });

    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy kết quả" });
    }

    const canRetryNow = result.canRetry && (result.retriesUsed || 0) < (result.maxRetries || 5);

    res.json({
      canRetry: result.canRetry,
      retriesUsed: result.retriesUsed || 0,
      maxRetries: result.maxRetries || 5,
      canRetryNow: canRetryNow,
      retriesRemaining: canRetryNow ? (result.maxRetries || 5) - (result.retriesUsed || 0) : 0
    });
  } catch (error) {
    console.error("Check can retry error:", error);
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

// Lấy chi tiết một kết quả bất kỳ (admin)
router.get("/admin/result/:resultId", requireAdminKey, async (req, res) => {
  try {
    const result = await QuizResult.findById(req.params.resultId).lean();
    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy kết quả" });
    }

    const user = await User.findById(result.userId).lean();
    const detailedResult = await buildDetailedResult(result);

    res.json({
      result: detailedResult,
      user: user
        ? {
            id: user._id,
            username: user.username,
            email: user.email,
          }
        : null,
    });
  } catch (error) {
    console.error("Admin get quiz result detail error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Cập nhật câu trả lời của một kết quả (admin)
router.patch("/admin/result/:resultId", requireAdminKey, async (req, res) => {
  try {
    const { answers, totalTimeSpent, status } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "Danh sách câu trả lời không hợp lệ" });
    }

    const invalidAnswer = answers.some(
      (ans) => typeof ans.questionId !== "string" || typeof ans.isCorrect !== "boolean" || typeof ans.userAnswer === "undefined"
    );

    if (invalidAnswer) {
      return res.status(400).json({ message: "Câu trả lời phải bao gồm questionId, userAnswer và isCorrect" });
    }

    const result = await QuizResult.findById(req.params.resultId);
    if (!result) {
      return res.status(404).json({ message: "Không tìm thấy kết quả" });
    }

    if (answers.length !== result.answers.length) {
      return res.status(400).json({ message: "Số lượng câu hỏi không khớp với kết quả gốc" });
    }

    const originalQuestionIds = new Set(result.answers.map((answer) => answer.questionId));
    const hasUnknownQuestion = answers.some((answer) => !originalQuestionIds.has(answer.questionId));

    if (hasUnknownQuestion) {
      return res.status(400).json({ message: "Câu trả lời chứa questionId không khớp" });
    }

    result.answers = answers.map((answer) => ({
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
      isCorrect: answer.isCorrect,
      timeSpent: typeof answer.timeSpent === "number" && answer.timeSpent >= 0 ? answer.timeSpent : 0,
    }));

    const score = result.answers.filter((answer) => answer.isCorrect).length;
    result.score = score;
    result.totalQuestions = result.answers.length;
    const questionCount = result.totalQuestions || 1;
    result.percentage = Math.round((score / questionCount) * 100);

    if (typeof totalTimeSpent === "number" && totalTimeSpent >= 0) {
      result.totalTimeSpent = totalTimeSpent;
    } else {
      result.totalTimeSpent = result.answers.reduce((sum, answer) => sum + (answer.timeSpent || 0), 0);
    }

    if (typeof status === "string" && ["completed", "abandoned"].includes(status)) {
      result.status = status;
    }

    await result.save();

    const detailedResult = await buildDetailedResult(result);
    res.json({ message: "Đã cập nhật kết quả", result: detailedResult });
  } catch (error) {
    console.error("Admin update quiz result error:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

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
        grade: gradeFromPercentage(result.percentage),
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