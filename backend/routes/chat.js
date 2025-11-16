import { Router } from "express";
import jwt from "jsonwebtoken";
import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";

const router = Router();

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";
let adminKeyWarningLogged = false;

const resolveTotalPurchased = (user) => {
  if (!user) return 0;
  if (typeof user.totalPurchasedMs === "number" && Number.isFinite(user.totalPurchasedMs)) {
    return user.totalPurchasedMs;
  }
  if (user.membershipExpiresAt && user.createdAt) {
    const expireTs = new Date(user.membershipExpiresAt).getTime();
    const createdTs = new Date(user.createdAt).getTime();
    if (Number.isFinite(expireTs) && Number.isFinite(createdTs)) {
      const diff = expireTs - createdTs;
      return diff > 0 ? diff : 0;
    }
  }
  return 0;
};

const requireUser = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Thiếu token" });
    }
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (e) {
    console.error("Chat auth error", e.message);
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};

const requireAdminKey = (req, res, next) => {
  if (!ADMIN_API_KEY) {
    return next();
  }
  const headerKey = req.headers["x-admin-key"];
  if (headerKey !== ADMIN_API_KEY) {
    return res.status(401).json({ message: "Không có quyền truy cập quản trị" });
  }
  return next();
};

const sanitizeMessage = (doc) => ({
  id: doc._id?.toString(),
  user: doc.user?.toString?.() || doc.user,
  sender: doc.sender,
  message: doc.message,
  readByAdmin: !!doc.readByAdmin,
  readByUser: !!doc.readByUser,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

router.get("/user", requireUser, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user: req.userId }).sort({ createdAt: 1 }).lean();
    await ChatMessage.updateMany(
      { user: req.userId, sender: "admin", readByUser: false },
      { readByUser: true }
    );
    res.json({ messages: messages.map(sanitizeMessage) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không lấy được tin nhắn" });
  }
});

router.post("/user", requireUser, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Nội dung trống" });
    }
    const doc = await ChatMessage.create({
      user: req.userId,
      sender: "user",
      message: message.trim().slice(0, 1000),
      readByAdmin: false,
      readByUser: true,
    });
    res.status(201).json({ message: sanitizeMessage(doc) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không gửi được tin nhắn" });
  }
});

router.get("/admin/threads", requireAdminKey, async (_req, res) => {
  try {
    const threads = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          lastMessage: { $first: "$message" },
          lastSender: { $first: "$sender" },
          lastAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$sender", "user"] }, { $eq: ["$readByAdmin", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$user._id",
          username: "$user.username",
          email: "$user.email",
          membershipLevel: "$user.membershipLevel",
          totalPurchasedMs: "$user.totalPurchasedMs",
          membershipExpiresAt: "$user.membershipExpiresAt",
          createdAt: "$user.createdAt",
          lastMessage: 1,
          lastSender: 1,
          lastAt: 1,
          unreadCount: 1,
        },
      },
      { $sort: { lastAt: -1 } },
    ]);

    res.json({
      threads: threads.map((t) => ({
        userId: t.userId.toString(),
        username: t.username,
        email: t.email,
        membershipLevel: t.membershipLevel,
        totalPurchasedMs: resolveTotalPurchased({
          totalPurchasedMs: t.totalPurchasedMs,
          membershipExpiresAt: t.membershipExpiresAt,
          createdAt: t.createdAt,
        }),
        lastMessage: t.lastMessage,
        lastSender: t.lastSender,
        lastAt: t.lastAt,
        unreadCount: t.unreadCount,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không lấy được danh sách hội thoại" });
  }
});

router.get("/admin/:userId", requireAdminKey, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const messages = await ChatMessage.find({ user: userId }).sort({ createdAt: 1 }).lean();
    await ChatMessage.updateMany(
      { user: userId, sender: "user", readByAdmin: false },
      { readByAdmin: true }
    );

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        membershipLevel: user.membershipLevel,
        totalPurchasedMs: resolveTotalPurchased(user),
      },
      messages: messages.map(sanitizeMessage),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không lấy được hội thoại" });
  }
});

router.post("/admin/:userId", requireAdminKey, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Nội dung trống" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const doc = await ChatMessage.create({
      user: userId,
      sender: "admin",
      message: message.trim().slice(0, 1000),
      readByAdmin: true,
      readByUser: false,
    });

    res.status(201).json({ message: sanitizeMessage(doc) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không gửi được tin nhắn" });
  }
});

export default router;
