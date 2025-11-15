import mongoose from "mongoose";

const PaymentTransactionSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    appTransId: { type: String, required: true, unique: true },
    zpTransId: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    rawData: { type: mongoose.Schema.Types.Mixed, default: null },
    callbackData: { type: mongoose.Schema.Types.Mixed, default: null },
    message: { type: String, default: "" },
  },
  { timestamps: true }
);

PaymentTransactionSchema.index({ provider: 1, appTransId: 1 }, { unique: true });

export default mongoose.model("PaymentTransaction", PaymentTransactionSchema);
