import { Router } from "express";
import emailService from "../services/emailService.js";

const router = Router();

// Test endpoint - CHỈ DÙNG ĐỂ TEST, XÓA SAU KHI PRODUCTION
router.post("/send-test-otp", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng cung cấp email" 
      });
    }

    console.log(`🧪 Testing OTP email to: ${email}`);
    
    // Test connection trước
    const verified = await emailService.verifyConnection();
    if (!verified) {
      return res.status(500).json({
        success: false,
        message: "Email service không kết nối được",
        details: "Kiểm tra EMAIL_HOST, EMAIL_USER, EMAIL_PASS trong Environment Variables"
      });
    }

    // Gửi email test
    const testOTP = "123456";
    const result = await emailService.sendOTPEmail(email, "TestUser", testOTP);

    if (result.success) {
      return res.json({
        success: true,
        message: "✅ Email đã được gửi thành công!",
        messageId: result.messageId,
        email: email,
        note: "Kiểm tra hộp thư và cả thư mục Spam"
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "❌ Gửi email thất bại",
        error: result.error
      });
    }
  } catch (error) {
    console.error("❌ Test email error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
});

// Kiểm tra cấu hình email
router.get("/check-config", (req, res) => {
  const config = {
    EMAIL_HOST: process.env.EMAIL_HOST || "NOT SET",
    EMAIL_PORT: process.env.EMAIL_PORT || "NOT SET",
    EMAIL_USER: process.env.EMAIL_USER || "NOT SET",
    EMAIL_PASS: process.env.EMAIL_PASS ? "***configured***" : "NOT SET",
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "NOT SET",
  };

  const allConfigured = Object.values(config).every(val => val !== "NOT SET");

  res.json({
    configured: allConfigured,
    config: config,
    message: allConfigured 
      ? "✅ Tất cả biến môi trường email đã được cấu hình" 
      : "❌ Thiếu một số biến môi trường email"
  });
});

export default router;
