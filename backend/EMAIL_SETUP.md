# Hướng dẫn cấu hình Email Service

## 1. Tạo App Password cho Gmail

### Bước 1: Bật 2-Factor Authentication
1. Đăng nhập vào Google Account: https://myaccount.google.com
2. Vào **Security** > **2-Step Verification**
3. Bật 2-Step Verification nếu chưa có

### Bước 2: Tạo App Password
1. Vào **Security** > **App passwords**
2. Chọn **Mail** và **Windows Computer** (hoặc Other)
3. Copy mật khẩu ứng dụng 16 ký tự

### Bước 3: Cập nhật file .env
```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM_NAME=TracNghiem Platform
```

## 2. Test Email Service

### Endpoint để test:
```
POST http://localhost:4000/api/payments/test/send-email
Authorization: Bearer <your-jwt-token>
```

### Payload:
```json
{
  "email": "test-email@gmail.com",
  "type": "welcome"
}
```

## 3. Email được gửi khi:
- ✅ Thanh toán thành công (tự động)
- ✅ User đăng ký mới (manual/optional)
- ✅ Test endpoint (development)

## 4. Template email bao gồm:
- 🎉 Header chào mừng
- 📋 Chi tiết thanh toán
- 🚀 Quyền lợi nhận được
- 🔗 Button call-to-action
- 📱 Mobile responsive

## 5. Error Handling:
- Email service không làm ảnh hưởng đến thanh toán
- Log errors để debug
- Fallback graceful nếu email fail