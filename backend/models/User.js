import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    membershipLevel: {
      type: String,
      enum: ["free", "day", "month", "year"],
      default: "free",
    },
    membershipExpiresAt: { type: Date, default: null },
    isDisabled: { type: Boolean, default: false },
    totalPurchasedMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
