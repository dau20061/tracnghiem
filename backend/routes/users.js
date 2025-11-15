import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";
let adminKeyWarningLogged = false;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const resolveTotalPurchased = (user) => {
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

const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      membershipLevel: user.membershipLevel,
      membershipExpiresAt: user.membershipExpiresAt,
      isDisabled: user.isDisabled,
      totalPurchasedMs: resolveTotalPurchased(user),
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

const authMiddleware = async (req, res, next) => {
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
    console.error("Auth error", e.message);
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};

const sanitizeUser = (user) => ({
  id: (user._id || user.id)?.toString(),
  username: user.username,
  email: user.email,
  role: user.role,
  membershipLevel: user.membershipLevel,
  membershipExpiresAt: user.membershipExpiresAt,
  isDisabled: !!user.isDisabled,
  totalPurchasedMs: resolveTotalPurchased(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const requireAdminKey = (req, res, next) => {
  if (!ADMIN_API_KEY) {
    if (!adminKeyWarningLogged) {
      adminKeyWarningLogged = true;
      }
    return next();
  }
  const headerKey = req.headers["x-admin-key"];
  if (headerKey !== ADMIN_API_KEY) {
    return res.status(401).json({ message: "Không có quyền truy cập quản trị" });
  }
  return next();
};

// Endpoint để tạo admin account (chỉ dùng trong development)
router.post("/create-admin", async (req, res) => {
  try {
    const { username, password, email, adminKey } = req.body || {};
    
    // Kiểm tra admin key để bảo mật
    if (adminKey !== "admin123456") {
      return res.status(403).json({ message: "Không có quyền" });
    }
    
    if (!username || !password) {
      return res.status(400).json({ message: "Thiếu username/password" });
    }
    
    // Kiểm tra user đã tồn tại chưa
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username đã tồn tại" });
    }
    
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email đã tồn tại" });
      }
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      passwordHash, 
      email: email || undefined,
      role: "admin"  // Set role admin ngay
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: "Đã tạo admin account thành công",
      user: {
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// Endpoint để set user làm admin (chỉ dùng trong development)
router.post("/make-admin", async (req, res) => {
  try {
    const { username, adminKey } = req.body || {};
    
    // Kiểm tra admin key để bảo mật
    if (adminKey !== "admin123456") {
      return res.status(403).json({ message: "Không có quyền" });
    }
    
    if (!username) {
      return res.status(400).json({ message: "Thiếu username" });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }
    
    user.role = "admin";
    await user.save();
    
    res.json({ 
      message: `Đã set user ${username} làm admin`,
      user: {
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Thiếu username/password/email" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ message: "Tài khoản đã tồn tại" });
    }
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res.status(409).json({ message: "Email đã được sử dụng" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, email: normalizedEmail });
    return res.status(201).json({ message: "Đăng ký thành công", user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "Thiếu username/password" });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }
    if (user.isDisabled) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    if (user.isDisabled) return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    res.json({ user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

const addDuration = (plan, currentExpiry) => {
  const now = new Date();
  const current = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now;
  const previous = new Date(current);
  if (plan === "day") {
    current.setDate(current.getDate() + 1);
  } else if (plan === "month") {
    current.setMonth(current.getMonth() + 1);
  } else if (plan === "year") {
    current.setFullYear(current.getFullYear() + 1);
  }
  const addedMs = Math.max(current.getTime() - previous.getTime(), 0);
  return { expiresAt: current, addedMs };
};

router.post("/upgrade", authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!plan || !["day", "month", "year"].includes(plan)) {
      return res.status(400).json({ message: "Plan không hợp lệ" });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }
    if (user.isDisabled) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }
  const { expiresAt, addedMs } = addDuration(plan, user.membershipExpiresAt);
  user.membershipLevel = plan;
  user.membershipExpiresAt = expiresAt;
  user.totalPurchasedMs = (user.totalPurchasedMs || 0) + addedMs;
    await user.save();
    const token = signToken(user);
    res.json({ message: "Đã nâng cấp", token, user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// ==== Admin APIs ====

router.get("/admin", requireAdminKey, async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json({ users: users.map((u) => sanitizeUser(u)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không lấy được danh sách user" });
  }
});

router.post("/admin", requireAdminKey, async (req, res) => {
  try {
    const { username, password, email, plan = "free", expiresAt, isDisabled = false } = req.body || {};
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Thiếu username/password/email" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ message: "Tài khoản đã tồn tại" });
    }
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res.status(409).json({ message: "Email đã được sử dụng" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const doc = new User({ username, passwordHash, email: normalizedEmail, isDisabled: !!isDisabled });

    if (["day", "month", "year"].includes(plan)) {
      const { expiresAt, addedMs } = addDuration(plan, null);
      doc.membershipLevel = plan;
      doc.membershipExpiresAt = expiresAt;
      doc.totalPurchasedMs = (doc.totalPurchasedMs || 0) + addedMs;
    } else {
      doc.membershipLevel = "free";
      doc.membershipExpiresAt = null;
    }

    if (expiresAt) {
      doc.membershipExpiresAt = new Date(expiresAt);
      doc.membershipLevel = plan || doc.membershipLevel;
    }

    await doc.save();
    res.status(201).json({ user: sanitizeUser(doc) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không tạo được user" });
  }
});

router.patch("/admin/:id/membership", requireAdminKey, async (req, res) => {
  try {
    const { plan, expiresAt, extendDays } = req.body || {};
    if (!plan && !expiresAt && !extendDays) {
      return res.status(400).json({ message: "Thiếu dữ liệu cập nhật" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    if (plan) {
      if (plan === "free") {
        user.membershipLevel = "free";
        user.membershipExpiresAt = null;
      } else if (["day", "month", "year"].includes(plan)) {
        const { expiresAt, addedMs } = addDuration(plan, user.membershipExpiresAt);
        user.membershipLevel = plan;
        user.membershipExpiresAt = expiresAt;
        user.totalPurchasedMs = (user.totalPurchasedMs || 0) + addedMs;
      } else {
        return res.status(400).json({ message: "Plan không hợp lệ" });
      }
    }

    if (extendDays) {
      const days = Number(extendDays);
      if (Number.isNaN(days) || days <= 0) {
        return res.status(400).json({ message: "extendDays không hợp lệ" });
      }
      const now = new Date();
      const base = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now ? new Date(user.membershipExpiresAt) : now;
      base.setDate(base.getDate() + days);
      user.membershipExpiresAt = base;
      user.totalPurchasedMs = (user.totalPurchasedMs || 0) + days * MS_PER_DAY;
    }

    if (expiresAt) {
      const dt = new Date(expiresAt);
      if (Number.isNaN(dt.getTime())) {
        return res.status(400).json({ message: "expiresAt không hợp lệ" });
      }
      user.membershipExpiresAt = dt;
    }

    await user.save();
    res.json({ user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không cập nhật được gói" });
  }
});

router.patch("/admin/:id/password", requireAdminKey, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ message: "Đã cập nhật mật khẩu", user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không đổi được mật khẩu" });
  }
});

router.patch("/admin/:id/status", requireAdminKey, async (req, res) => {
  try {
    const { disabled } = req.body || {};
    if (typeof disabled !== "boolean") {
      return res.status(400).json({ message: "disabled phải là boolean" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    user.isDisabled = disabled;
    await user.save();
    res.json({ user: sanitizeUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không cập nhật trạng thái" });
  }
});

router.delete("/admin/:id", requireAdminKey, async (req, res) => {
  try {
    const del = await User.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json({ message: "Đã xóa user", id: req.params.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Không xóa được user" });
  }
});

export default router;
