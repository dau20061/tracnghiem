import "dotenv/config.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import quizzesRoutes from "./routes/quizzes.js";
import imagesRoutes from "./routes/images.js";
import usersRoutes from "./routes/users.js";



const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);

app.use("/api/images", imagesRoutes);
app.use("/api/quizzes", quizzesRoutes);


// Start
const PORT = process.env.PORT || 4000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log("Server listening on", PORT));
  })
  .catch((err) => {
    console.error("Mongo connect error:", err);
    process.exit(1);
  });
