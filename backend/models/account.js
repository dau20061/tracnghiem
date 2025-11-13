import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema(
  {
    quizId: { type: String, required: true, index: true }, 
    username: { type: String, required: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

AccountSchema.index({ quizId: 1, username: 1 }, { unique: true }); // 1 username chỉ dùng cho 1 quiz

export default mongoose.model("Account", AccountSchema);
