// backend/routes/auth.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Account from "../models/account.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { quizId, username, password } = req.body || {};
    if (!quizId || !username || !password) {
      return res.status(400).json({ message: "Thiếu quizId/username/password" });
    }
    const acc = await Account.findOne({ quizId, username });
    if (!acc) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const ok = await bcrypt.compare(password, acc.passwordHash);
    if (!ok) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const token = jwt.sign(
      { sub: acc._id.toString(), quizId, username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    return res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// GET /api/auth/accounts?quizId=ic3-lv1-1
router.get("/accounts", async (req, res) => {
  try {
    const { quizId } = req.query;
    const filter = quizId ? { quizId } : {};
    const list = await Account.find(filter).select("-passwordHash").lean();
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// DELETE /api/auth/accounts/:id
// backend/routes/auth.js

// DELETE /api/auth/accounts (xóa nhiều theo filter)
router.delete("/accounts", async (req, res) => {
  try {
    const { quizId, username } = req.query;
    if (!quizId && !username) {
      return res.status(400).json({ message: "Cần quizId hoặc username để xóa." });
    }
    const filter = {};
    if (quizId) filter.quizId = quizId;
    if (username) filter.username = username;

    const r = await Account.deleteMany(filter);
    return res.json({ message: "Đã xóa", deletedCount: r.deletedCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});


export default router;
