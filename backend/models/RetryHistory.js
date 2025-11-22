import mongoose from "mongoose";

// Schema để lưu lịch sử các lần làm lại
const RetryHistorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  quizResultId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'QuizResult', 
    required: true 
  },
  quizId: { 
    type: String, 
    required: true 
  },
  quizTitle: { 
    type: String, 
    required: true 
  },
  
  // Kết quả của lần retry này
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  
  // Chi tiết câu trả lời của lần retry
  answers: [{
    questionId: { type: String, required: true },
    userAnswer: { type: mongoose.Schema.Types.Mixed },
    isCorrect: { type: Boolean, required: true },
    timeSpent: { type: Number, default: 0 }
  }],
  
  // Thời gian
  totalTimeSpent: { type: Number, default: 0 },
  completedAt: { type: Date, required: true },
  
  // Số lần retry (1, 2, 3, 4, 5)
  retryNumber: { type: Number, required: true },
  
  // Session tracking
  sessionId: { type: String }
}, { 
  timestamps: true 
});

// Index để query nhanh
RetryHistorySchema.index({ userId: 1, quizResultId: 1, completedAt: -1 });
RetryHistorySchema.index({ quizResultId: 1, retryNumber: 1 });

// Virtual để tính grade
RetryHistorySchema.virtual('grade').get(function() {
  if (this.percentage >= 90) return 'A';
  if (this.percentage >= 80) return 'B';
  if (this.percentage >= 70) return 'C';
  if (this.percentage >= 60) return 'D';
  return 'F';
});

// Method để format thời gian
RetryHistorySchema.methods.getFormattedTime = function() {
  const minutes = Math.floor(this.totalTimeSpent / 60);
  const seconds = this.totalTimeSpent % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default mongoose.model("RetryHistory", RetryHistorySchema);
