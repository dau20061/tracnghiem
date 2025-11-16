import "dotenv/config.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

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



const app = express();
app.use(cors({ origin: true, credentials: true }));
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

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    
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
