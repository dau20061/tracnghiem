import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: String, enum: ["user", "admin"], required: true },
    message: { type: String, required: true, trim: true },
    readByAdmin: { type: Boolean, default: false },
    readByUser: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("ChatMessage", ChatMessageSchema);
