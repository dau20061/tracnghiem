import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import quizzesRoutes from "./routes/quizzes.js";
import imagesRoutes from "./routes/images.js";
import usersRoutes from "./routes/users.js";
import chatRoutes from "./routes/chat.js";
import paymentsRoutes from "./routes/payments.js";
import quizResultsRoutes from "./routes/quiz-results.js";
import revenueStatsRoutes from "./routes/revenue-stats.js";
import emailService from "./services/emailService.js";
import testEmailRoutes from "./routes/test-email.js";
import User from "./models/User.js";



const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://tracnghiem-tawny.vercel.app",
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/quiz-results", quizResultsRoutes);
app.use("/api/revenue-stats", revenueStatsRoutes);
app.use("/api/test-email", testEmailRoutes);

app.use("/api/images", imagesRoutes);
app.use("/api/quizzes", quizzesRoutes);


// Start
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "123456";
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || "admin@tracnghiem.local";

async function ensureDefaultAdmin() {
  try {
    const existing = await User.findOne({ username: DEFAULT_ADMIN_USERNAME });
    if (!existing) {
      let email = DEFAULT_ADMIN_EMAIL;
      if (email) {
        const emailUsed = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
        if (emailUsed) {
          email = undefined;
        }
      }
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await User.create({
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash,
        role: "admin",
        email,
        isVerified: true,
        accountStatus: "active",
      });
      console.log(`✅ Default admin created: ${DEFAULT_ADMIN_USERNAME}/${DEFAULT_ADMIN_PASSWORD}`);
      return;
    }

    let updated = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      updated = true;
    }
    if (!existing.isVerified) {
      existing.isVerified = true;
      existing.accountStatus = "active";
      updated = true;
    }
    if (updated) {
      await existing.save();
      console.log(`ℹ️ Ensured admin privileges for ${DEFAULT_ADMIN_USERNAME}`);
    }
  } catch (err) {
    console.error("Không thể tạo admin mặc định:", err.message);
  }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await ensureDefaultAdmin();
    
    // Kiểm tra email service
    console.log("🔧 Initializing email service...");
    await emailService.verifyConnection();
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server listening on ${HOST}:${PORT}`);
      console.log("📧 Email service ready");
    });
  })
  .catch((err) => {
    console.error("Mongo connect error:", err);
    process.exit(1);
  });
