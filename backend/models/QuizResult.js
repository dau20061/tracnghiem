import mongoose from "mongoose";

// Schema để lưu câu trả lời của user cho từng câu hỏi
const UserAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  userAnswer: { type: mongoose.Schema.Types.Mixed }, // Có thể là string, array, object tùy theo type câu hỏi
  isCorrect: { type: Boolean, required: true },
  timeSpent: { type: Number, default: 0 }, // Thời gian làm câu này (giây)
}, { _id: false });

// Schema chính để lưu kết quả làm bài
const QuizResultSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  quizId: { 
    type: String, 
    ref: 'Quiz', 
    required: true 
  },
  quizTitle: { type: String, required: true }, // Lưu title để hiển thị nhanh
  
  // Kết quả tổng quan
  score: { type: Number, required: true }, // Số câu đúng
  totalQuestions: { type: Number, required: true }, // Tổng số câu
  percentage: { type: Number, required: true }, // Phần trăm = (score/totalQuestions) * 100
  
  // Chi tiết từng câu trả lời
  answers: [UserAnswerSchema],
  
  // Thống kê thời gian
  totalTimeSpent: { type: Number, default: 0 }, // Tổng thời gian làm bài (giây)
  startedAt: { type: Date, required: true },
  completedAt: { type: Date, required: true },
  
  // Trạng thái
  status: { 
    type: String, 
    enum: ['completed', 'abandoned'], 
    default: 'completed' 
  },
  
  // Session ID để track unique quiz sessions
  sessionId: { type: String },
  
  // Retry tracking for non-timed quizzes
  retriesUsed: { type: Number, default: 0 }, // Số lần đã làm lại
  maxRetries: { type: Number, default: 5 }, // Tối đa 5 lần làm lại
  canRetry: { type: Boolean, default: true }, // Có thể làm lại không (false nếu quiz có thời gian)
  originalAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizResult' }, // Liên kết đến lần làm gốc
}, { 
  timestamps: true 
});

// Tạo index để query nhanh
QuizResultSchema.index({ userId: 1, completedAt: -1 });
QuizResultSchema.index({ userId: 1, quizId: 1, completedAt: -1 });

// Virtual để tính grade dựa trên percentage
QuizResultSchema.virtual('grade').get(function() {
  if (this.percentage >= 90) return 'A';
  if (this.percentage >= 80) return 'B';
  if (this.percentage >= 70) return 'C';
  if (this.percentage >= 60) return 'D';
  return 'F';
});

// Method để format thời gian
QuizResultSchema.methods.getFormattedTime = function() {
  const minutes = Math.floor(this.totalTimeSpent / 60);
  const seconds = this.totalTimeSpent % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Static method để lấy thống kê user
QuizResultSchema.statics.getUserStats = async function(userId) {
  const results = await this.find({ userId }).sort({ completedAt: -1 });
  
  if (results.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      bestScore: 0,
      totalTimeSpent: 0,
      completedQuizzes: 0
    };
  }
  
  const totalScore = results.reduce((sum, result) => sum + result.percentage, 0);
  const bestScore = Math.max(...results.map(result => result.percentage));
  const totalTime = results.reduce((sum, result) => sum + result.totalTimeSpent, 0);
  
  return {
    totalAttempts: results.length,
    averageScore: Math.round(totalScore / results.length),
    bestScore: Math.round(bestScore),
    totalTimeSpent: totalTime,
    completedQuizzes: new Set(results.map(r => r.quizId)).size
  };
};

export default mongoose.model("QuizResult", QuizResultSchema);