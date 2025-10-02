import { Router } from "express";
import bcrypt from "bcryptjs";
import Account from "../models/account.js";

const router = Router();

// POST /api/admin/accounts
// body: { quizId, username, password }
router.post("/accounts", async (req, res) => {
  try {
    const { quizId, username, password } = req.body || {};
    if (!quizId || !username || !password) {
      return res.status(400).json({ message: "Thiếu quizId/username/password" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const doc = await Account.create({ quizId, username, passwordHash });
    res.status(201).json({ id: doc._id, quizId: doc.quizId, username: doc.username });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "Tài khoản đã tồn tại cho quiz này" });
    }
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// (Tuỳ chọn) Tạo hàng loạt nhanh
// POST /api/admin/seed
// body: { quizId, accounts: [{username, password}, ...] }
router.post("/seed", async (req, res) => {
  try {
    const { quizId, accounts = [] } = req.body || {};
    if (!quizId || accounts.length === 0) {
      return res.status(400).json({ message: "Thiếu quizId/accounts" });
    }
    const docs = [];
    for (const a of accounts) {
      const passwordHash = await bcrypt.hash(a.password, 10);
      docs.push({ quizId, username: a.username, passwordHash });
    }
    await Account.insertMany(docs, { ordered: false });
    res.status(201).json({ inserted: docs.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Seed lỗi (có thể trùng username)" });
  }
});

export default router;
