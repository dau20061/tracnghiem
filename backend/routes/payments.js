import { Router } from "express";
import CryptoJS from "crypto-js";
import moment from "moment";
import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import emailService from "../services/emailService.js";

const router = Router();

const PLAN_CONFIG = {
  day: { amount: 29000, label: "Gói 3 lượt", attempts: 3 },
  month: { amount: 149000, label: "Gói 20 lượt", attempts: 20 },
  year: { amount: 1390000, label: "Gói 200 lượt", attempts: 200 },
};

// ZaloPay Configuration
const config = {
  app_id: process.env.ZALOPAY_APP_ID || "2554",
  key1: process.env.ZALOPAY_KEY1 || "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
  key2: process.env.ZALOPAY_KEY2 || "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
  endpoint: process.env.ZALOPAY_CREATE_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create",
  callback_url: process.env.ZALOPAY_CALLBACK_URL || "http://localhost:4000/api/payments/zalopay/callback",
  redirect_url: process.env.ZALOPAY_REDIRECT_URL || "http://localhost:5173",
};

// In-memory payment status tracking (similar to provided code)
let paymentStatusMap = {};

const requireUser = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Thiếu token" });
    }
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (e) {
    console.error("Auth error", e.message);
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};

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

// Create ZaloPay Order (based on provided code)
router.post("/zalopay/order", requireUser, async (req, res) => {
  try {
    const { plan } = req.body || {};
    const planInfo = PLAN_CONFIG[plan];
    
    if (!planInfo) {
      return res.status(400).json({ message: "Plan không hợp lệ" });
    }

    const transID = Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;
    
    const order = {
      app_id: config.app_id,
      app_trans_id: app_trans_id,
      app_user: req.userId,
      app_time: Date.now(),
      item: JSON.stringify([{ 
        "itemid": plan, 
        "itemname": planInfo.label, 
        "itemprice": planInfo.amount, 
        "itemquantity": 1 
      }]),
      embed_data: JSON.stringify({
        redirect_url: config.redirect_url,
        userId: req.userId,
        plan: plan,
      }),
      amount: planInfo.amount,
      description: `${planInfo.label} - ${req.userEmail || "user"}`,
      bank_code: "zalopayapp",
      callback_url: config.callback_url
    };

    // Create MAC signature
    const data = `${order.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    // Store transaction in database
    await PaymentTransaction.create({
      provider: "zalopay",
      appTransId: app_trans_id,
      user: req.userId,
      plan: plan,
      amount: planInfo.amount,
      status: "pending",
      rawData: order,
      message: "Order created",
    });

    try {
      const response = await axios.post(config.endpoint, null, { params: order });
      
      if (response.data.order_url) {
        // Store in memory map for quick access
        paymentStatusMap[app_trans_id] = { 
          status: 'pending', 
          userId: req.userId, 
          plan: plan,
          amount: planInfo.amount 
        };
        
        res.json({
          orderUrl: response.data.order_url,
          order_Url: response.data.order_url, // For compatibility
          app_trans_id: app_trans_id,
          appTransId: app_trans_id, // For compatibility
          returnCode: response.data.return_code,
          returnMessage: response.data.return_message,
          qrCode: response.data.qr_code || response.data.qrcode || null,
        });
      } else {
        res.status(500).json({ message: "Không có 'order_url' trong phản hồi từ ZaloPay." });
      }
    } catch (error) {
      console.error("ZaloPay order creation error:", error);
      res.status(500).json({ 
        message: error.response ? error.response.data : 'Lỗi không xác định khi tạo đơn hàng' 
      });
    }
  } catch (e) {
    console.error("Create ZaloPay order error", e);
    res.status(500).json({ message: "Không tạo được đơn thanh toán" });
  }
});

// ZaloPay Callback (based on provided code with enhanced logging)
router.post('/zalopay/callback', async (req, res) => {
  let result = {};
  console.log("=== ZaloPay Callback Received ===");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("================================");
  
  try {
    const dataStr = req.body.data;
    const reqMac = req.body.mac;
    
    if (!dataStr || !reqMac) {
      console.log("Missing data or mac in callback");
      result.return_code = -1;
      result.return_message = 'Missing data or mac';
      return res.json(result);
    }
    
    // Verify MAC
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    console.log("Expected MAC:", mac);
    console.log("Received MAC:", reqMac);

    if (reqMac !== mac) {
      console.log("MAC verification failed");
      result.return_code = -1;
      result.return_message = 'mac not equal';
    } else {
      const dataJson = JSON.parse(dataStr);
      const transactionId = dataJson['app_trans_id'];
      const embed = dataJson.embed_data ? JSON.parse(dataJson.embed_data) : {};
      const { userId, plan } = embed;
      
      console.log('Đơn hàng', transactionId, 'thanh toán thành công');
      console.log('User ID:', userId, 'Plan:', plan);

      // Update memory status map with more detailed info
      paymentStatusMap[transactionId] = { 
        status: 'success', 
        userId: userId, 
        plan: plan,
        zpTransId: dataJson.zp_trans_id,
        amount: dataJson.amount,
        timestamp: new Date().toISOString()
      };

      // Update database with better error handling
      try {
        const trx = await PaymentTransaction.findOne({ 
          provider: "zalopay", 
          appTransId: transactionId 
        });
        
        if (trx) {
          console.log('Found transaction in database:', trx._id);
          
          if (trx.status === "paid") {
            console.log('Transaction already marked as paid');
            result.return_code = 1;
            result.return_message = 'success';
            return res.json(result);
          }
          
          if (userId && plan) {
            // Update user membership
            const user = await User.findById(userId);
            if (user) {
              console.log('Updating user membership:', user.email);
              const planInfo = PLAN_CONFIG[plan];
              
              // Add attempts instead of time-based membership
              if (planInfo && planInfo.attempts) {
                user.remainingAttempts = (user.remainingAttempts || 0) + planInfo.attempts;
                user.totalPurchasedAttempts = (user.totalPurchasedAttempts || 0) + planInfo.attempts;
                user.membershipLevel = plan;
                // Still set expiry for display/tracking purposes
                const { expiresAt, addedMs } = addDuration(plan, user.membershipExpiresAt);
                user.membershipExpiresAt = expiresAt;
                user.totalPurchasedMs = (user.totalPurchasedMs || 0) + addedMs;
                await user.save();
                console.log(`User attempts updated: +${planInfo.attempts}, total: ${user.remainingAttempts}`);
              }
              console.log('User membership updated successfully');
              
              // Gửi email thông báo thanh toán thành công
              try {
                const planInfo = PLAN_CONFIG[plan];
                const paymentData = {
                  userName: user.fullName || user.username || user.email.split('@')[0],
                  packageName: planInfo ? planInfo.label : `Gói ${plan}`,
                  amount: new Intl.NumberFormat('vi-VN', { 
                    style: 'currency', 
                    currency: 'VND' 
                  }).format(dataJson.amount),
                  transactionId: transactionId,
                  purchaseDate: new Date().toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                };
                
                const emailResult = await emailService.sendPaymentSuccessEmail(user.email, paymentData);
                if (emailResult.success) {
                  console.log('✅ Payment success email sent to:', user.email);
                } else {
                  console.error('❌ Failed to send payment email:', emailResult.error);
                }
              } catch (emailError) {
                console.error('❌ Email sending error:', emailError);
                // Không làm ảnh hưởng đến quá trình thanh toán
              }
            } else {
              console.log('User not found:', userId);
            }

            // Update transaction
            trx.status = "paid";
            trx.zpTransId = dataJson.zp_trans_id;
            trx.callbackData = dataJson;
            trx.message = "Payment successful via callback";
            await trx.save();
            console.log('Transaction updated to paid status');
          } else {
            console.log('Missing userId or plan in embed data');
          }
        } else {
          console.log('Transaction not found in database:', transactionId);
          // Create transaction record if not exists
          await PaymentTransaction.create({
            provider: "zalopay",
            appTransId: transactionId,
            zpTransId: dataJson.zp_trans_id,
            user: userId,
            plan: plan,
            amount: dataJson.amount,
            status: "paid",
            callbackData: dataJson,
            message: "Payment received via callback but not pre-created",
          });
          console.log('Created new transaction record from callback');
        }
      } catch (dbError) {
        console.error("Database update error:", dbError);
      }

      result.return_code = 1;
      result.return_message = 'success';
    }
  } catch (ex) {
    console.error("Callback processing error:", ex);
    result.return_code = 0;
    result.return_message = ex.message;
  }
  
  res.json(result);
});

// Payment Status Check (based on provided code)
router.get('/payment-status/:transactionId', requireUser, (req, res) => {
  const transactionId = req.params.transactionId;
  const status = paymentStatusMap[transactionId] || { status: 'pending' };
  res.json(status);
});

// ZaloPay Status Check (enhanced with better status tracking)
router.get("/zalopay/status/:appTransId", requireUser, async (req, res) => {
  try {
    const appTransId = req.params.appTransId;
    console.log(`Checking status for transaction: ${appTransId}, user: ${req.userId}`);
    
    // Check memory first for faster response
    const memoryStatus = paymentStatusMap[appTransId];
    console.log('Memory status:', memoryStatus);
    
    if (memoryStatus && memoryStatus.status === 'success') {
      console.log('Returning success status from memory');
      return res.json({
        status: "paid",
        plan: memoryStatus.plan,
        amount: memoryStatus.amount || 0,
        zpTransId: memoryStatus.zpTransId,
        message: "Payment successful",
        source: "memory"
      });
    }
    
    // Check database
    const trx = await PaymentTransaction.findOne({
      provider: "zalopay",
      appTransId: appTransId,
      user: req.userId,
    }).lean();
    
    console.log('Database transaction:', trx);
    
    if (!trx) {
      console.log('Transaction not found in database');
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }
    
    // Update memory if transaction is paid but not in memory
    if (trx.status === "paid" && (!memoryStatus || memoryStatus.status !== 'success')) {
      console.log('Updating memory status from database');
      paymentStatusMap[appTransId] = {
        status: 'success',
        userId: trx.user.toString(),
        plan: trx.plan,
        amount: trx.amount,
        zpTransId: trx.zpTransId,
        timestamp: new Date().toISOString()
      };
    }
    
    res.json({
      status: trx.status,
      plan: trx.plan,
      amount: trx.amount,
      zpTransId: trx.zpTransId,
      updatedAt: trx.updatedAt,
      message: trx.message,
      source: "database"
    });
  } catch (e) {
    console.error("Get ZaloPay status error", e);
    res.status(500).json({ message: "Không lấy được trạng thái" });
  }
});

// Development: Simulate payment success
router.post("/zalopay/simulate/:appTransId", requireUser, async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Chỉ dành cho development" });
    }
    
    const appTransId = req.params.appTransId;
    const trx = await PaymentTransaction.findOne({
      provider: "zalopay",
      appTransId: appTransId,
      user: req.userId,
    });
    
    if (!trx) {
      return res.status(404).json({ message: "Không tìm thấy giao dịch" });
    }
    
    if (trx.status === "paid") {
      return res.json({ message: "Giao dịch đã thanh toán thành công trước đó" });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }
    
    // Update user membership with attempts
    const planInfo = PLAN_CONFIG[trx.plan];
    if (planInfo && planInfo.attempts) {
      user.remainingAttempts = (user.remainingAttempts || 0) + planInfo.attempts;
      user.totalPurchasedAttempts = (user.totalPurchasedAttempts || 0) + planInfo.attempts;
    }
    user.membershipLevel = trx.plan;
    const { expiresAt, addedMs } = addDuration(trx.plan, user.membershipExpiresAt);
    user.membershipExpiresAt = expiresAt;
    user.totalPurchasedMs = (user.totalPurchasedMs || 0) + addedMs;
    await user.save();
    
    // Update transaction
    trx.status = "paid";
    trx.zpTransId = `DEV_${Date.now()}`;
    trx.message = "Simulated paid for development";
    await trx.save();

    // Update memory map
    paymentStatusMap[appTransId] = { 
      status: 'success', 
      userId: req.userId, 
      plan: trx.plan,
      amount: trx.amount,
      zpTransId: trx.zpTransId,
      timestamp: new Date().toISOString()
    };

    // Gửi email thông báo thanh toán thành công
    try {
      const planInfo = PLAN_CONFIG[trx.plan];
      const paymentData = {
        userName: user.fullName || user.username || user.email.split('@')[0],
        packageName: planInfo ? planInfo.label : `Gói ${trx.plan}`,
        amount: new Intl.NumberFormat('vi-VN', { 
          style: 'currency', 
          currency: 'VND' 
        }).format(trx.amount),
        transactionId: appTransId,
        purchaseDate: new Date().toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      
      const emailResult = await emailService.sendPaymentSuccessEmail(user.email, paymentData);
      if (emailResult.success) {
        console.log('✅ Payment success email sent to:', user.email);
      } else {
        console.error('❌ Failed to send payment email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
    }

    res.json({ 
      message: "Đã mô phỏng thanh toán thành công",
      emailSent: true
    });
  } catch (e) {
    console.error("Simulate payment error", e);
    res.status(500).json({ message: "Lỗi mô phỏng thanh toán" });
  }
});

// Test endpoint to check if callback URL is reachable
router.get("/test/callback", (req, res) => {
  res.json({
    message: "Callback endpoint is reachable!",
    timestamp: new Date().toISOString(),
    url: req.protocol + '://' + req.get('host') + req.originalUrl
  });
});

// Test endpoint to simulate callback data
router.post("/test/simulate-callback", async (req, res) => {
  try {
    const { appTransId } = req.body;
    
    if (!appTransId) {
      return res.status(400).json({ message: "appTransId is required" });
    }
    
    // Find transaction
    const trx = await PaymentTransaction.findOne({
      provider: "zalopay",
      appTransId: appTransId,
    });
    
    if (!trx) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    // Create mock callback data
    const mockCallbackData = {
      data: JSON.stringify({
        app_trans_id: appTransId,
        zp_trans_id: `TEST_${Date.now()}`,
        amount: trx.amount,
        embed_data: JSON.stringify({
          userId: trx.user,
          plan: trx.plan,
          redirect_url: config.redirect_url
        })
      })
    };
    
    // Create MAC
    mockCallbackData.mac = CryptoJS.HmacSHA256(mockCallbackData.data, config.key2).toString();
    
    // Call our own callback endpoint
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/payments/zalopay/callback`;
    console.log('Simulating callback to:', callbackUrl);
    
    const response = await axios.post(callbackUrl, mockCallbackData);
    
    res.json({
      message: "Callback simulation completed",
      callbackResponse: response.data,
      mockData: mockCallbackData
    });
  } catch (e) {
    console.error("Simulate callback error", e);
    res.status(500).json({ message: "Lỗi mô phỏng callback" });
  }
});

// Test endpoint to send email
router.post("/test/send-email", requireUser, async (req, res) => {
  try {
    const { email, type = "welcome" } = req.body;
    const targetEmail = email || req.userEmail;
    
    if (!targetEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    let result;
    
    if (type === "payment") {
      // Test payment success email
      const mockPaymentData = {
        userName: "Nguyễn Văn A",
        packageName: "Gói 1 tháng", 
        amount: "149,000 VND",
        transactionId: "TEST_" + Date.now(),
        purchaseDate: new Date().toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      
      result = await emailService.sendPaymentSuccessEmail(targetEmail, mockPaymentData);
    } else {
      // Test welcome email
      result = await emailService.sendWelcomeEmail(targetEmail, "Test User");
    }
    
    if (result.success) {
      res.json({ 
        message: "Email sent successfully", 
        messageId: result.messageId,
        to: targetEmail,
        type: type
      });
    } else {
      res.status(500).json({ 
        message: "Failed to send email", 
        error: result.error 
      });
    }
  } catch (e) {
    console.error("Test email error", e);
    res.status(500).json({ message: "Lỗi test email" });
  }
});

export default router;
