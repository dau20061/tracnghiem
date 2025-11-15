# ZaloPay + ngrok Integration Guide

## 🚀 Quick Setup

### 1. Download và cài đặt ngrok

```bash
# Tải ngrok từ: https://ngrok.com/download
# Giải nén vào thư mục (ví dụ: C:\ngrok\)
```

### 2. Khởi động backend server

```bash
cd backend
npm run dev
```

### 3. Khởi động ngrok (terminal mới)

```bash
# Mở terminal mới
cd C:\ngrok  # Đường dẫn tới thư mục chứa ngrok.exe
ngrok http 4000
```

### 4. Cấu hình ngrok URL

```bash
# Copy URL từ ngrok (ví dụ: https://abc123.ngrok.io)
node setup-ngrok.js https://abc123.ngrok.io
```

## 📋 API Endpoints

### Tạo đơn thanh toán
```
POST /api/payments/zalopay/order
Authorization: Bearer <token>
Body: { "plan": "day|month|year" }
```

### Callback từ ZaloPay
```
POST /api/payments/zalopay/callback
Body: { "data": "...", "mac": "..." }
```

### Kiểm tra trạng thái thanh toán
```
GET /api/payments/zalopay/status/:appTransId
Authorization: Bearer <token>
```

### Test endpoints
```
GET /api/payments/test/callback
POST /api/payments/test/simulate-callback
```

## 🔧 Debugging

### 1. Kiểm tra callback URL
```
curl https://your-ngrok-url.ngrok.io/api/payments/test/callback
```

### 2. Kiểm tra log
- Backend console: Hiển thị tất cả callback data
- Ngrok dashboard: http://127.0.0.1:4040 (request history)

### 3. Test flow hoàn chỉnh
1. Đăng nhập → /upgrade
2. Chọn gói → Tạo order
3. Thanh toán qua ZaloPay
4. Callback tự động cập nhật status
5. Redirect về homepage với thông báo thành công

## ⚠️ Lưu ý quan trọng

1. **Ngrok URL thay đổi** mỗi lần restart → Cần cập nhật lại .env
2. **Callback phải HTTPS** → ZaloPay chỉ gọi HTTPS URLs
3. **MAC verification** → Đảm bảo KEY2 chính xác
4. **Memory + Database** → Status được lưu cả 2 nơi để đảm bảo

## 🔍 Troubleshooting

### Callback không nhận được:
```bash
# Kiểm tra ngrok active
curl -X GET http://127.0.0.1:4040/api/tunnels

# Test callback endpoint
curl https://your-ngrok-url.ngrok.io/api/payments/test/callback
```

### MAC verification failed:
```bash
# Kiểm tra KEY2 trong .env
# Đảm bảo không có space thừa
```

### Status không cập nhật:
```bash
# Kiểm tra logs trong backend console
# Verify transaction exists trong database
```

## 📞 Support Commands

```bash
# Restart ngrok với URL mới
ngrok http 4000

# Cập nhật .env với URL mới  
node setup-ngrok.js https://new-url.ngrok.io

# Restart backend
npm run dev

# Test callback
curl -X POST https://your-url.ngrok.io/api/payments/test/simulate-callback \
  -H "Content-Type: application/json" \
  -d '{"appTransId":"231114_123456"}'
```