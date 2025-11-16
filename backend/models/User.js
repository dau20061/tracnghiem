import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    membershipLevel: {
      type: String,
      enum: ["free", "day", "month", "year"],
      default: "free",
    },
    membershipExpiresAt: { type: Date, default: null },
    isDisabled: { type: Boolean, default: false },
    totalPurchasedMs: { type: Number, default: 0 },
    
    // OTP verification fields
    isVerified: { type: Boolean, default: false },
    verificationOTP: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    accountStatus: {
      type: String,
      enum: ["pending", "active", "disabled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
