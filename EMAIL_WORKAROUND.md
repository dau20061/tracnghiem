# Hướng dẫn sử dụng hệ thống khi Email Service bị timeout

## Vấn đề
Gmail SMTP bị timeout từ Render do:
- Gmail chặn kết nối từ một số IP của Render
- Firewall/Security của Gmail

## Giải pháp đã áp dụng

### 1. Hệ thống vẫn hoạt động bình thường
- ✅ Đăng ký vẫn tạo tài khoản thành công
- ✅ OTP được lưu trong database
- ✅ OTP được log trong Render logs

### 2. Cách lấy OTP khi email không gửi được

#### Phương án A: Xem Render Logs
1. Vào [Render Dashboard](https://dashboard.render.com/)
2. Chọn backend service
3. Tab **Logs**
4. Tìm dòng: `📧 OTP sent to [email]: [123456]`
5. Copy mã OTP 6 số

#### Phương án B: API Debug (Development)
Gọi API để lấy OTP:
```bash
GET https://tracnghiem-1.onrender.com/api/users/get-otp/{username}
Header: x-admin-key: [ADMIN_API_KEY từ .env]
```

Response:
```json
{
  "username": "testuser",
  "email": "test@email.com",
  "otp": "123456",
  "expiresAt": "2024-11-16T07:00:00.000Z",
  "isExpired": false,
  "isVerified": false
}
```

#### Phương án C: Admin Panel
1. Admin vào Render logs
2. Tìm OTP của user
3. Hỗ trợ user qua chat/support

### 3. Quy trình đăng ký mới

**User:**
1. Đăng ký tài khoản → Thành công
2. Chuyển đến trang nhập OTP
3. **Nếu không nhận được email:**
   - Click "Gửi lại OTP" (thử lại)
   - Hoặc liên hệ admin qua chat support

**Admin:**
1. User báo không nhận được OTP
2. Admin vào Render logs
3. Tìm dòng: `📧 OTP sent to [email]: [123456]`
4. Gửi OTP cho user qua chat

### 4. Giải pháp lâu dài

#### Option 1: SendGrid (Khuyến nghị)
- Free: 100 emails/day
- Ổn định, không bị block
- Setup nhanh

**Cách setup:**
1. Đăng ký tại https://sendgrid.com
2. Tạo API Key
3. Thêm vào Render Environment:
```
SENDGRID_API_KEY=SG.xxxxx
EMAIL_SERVICE=sendgrid
```

4. Cài package:
```bash
npm install @sendgrid/mail
```

5. Code đã sẵn sàng cho SendGrid (xem comment trong emailService.js)

#### Option 2: Mailgun
- Free: 5000 emails/month đầu
- Tương tự SendGrid

#### Option 3: AWS SES
- Rất rẻ: $0.10 per 1000 emails
- Professional

#### Option 4: Gmail với OAuth2 (Phức tạp hơn)
- An toàn hơn App Password
- Không bị block thường xuyên

## Kiểm tra nhanh

### Test 1: Đăng ký tài khoản
```
1. Vào http://localhost:5174/login
2. Click "Đăng ký"
3. Điền thông tin
4. Submit
```

### Test 2: Xem logs
```
1. Vào Render Dashboard
2. Logs tab
3. Tìm "OTP sent to"
```

### Test 3: Resend OTP
```
1. Trang verify-otp
2. Click "Gửi lại mã OTP"
3. Kiểm tra logs
```

## Temporary Workaround

Nếu cần test ngay, có thể:

1. **Bỏ qua xác thực OTP tạm thời** (KHÔNG khuyến nghị production):
```javascript
// routes/users.js - handleRegister
user.isVerified = true; // Thêm dòng này
user.accountStatus = "active"; // Thêm dòng này
```

2. **Hoặc set OTP cố định** để test:
```javascript
const otp = "123456"; // Thay vì random
```

## Logs để theo dõi

Các dòng quan trọng trong Render logs:
```
✅ Email service ready           → Email service khởi động OK
📧 OTP sent to email: 123456     → Email gửi thành công
❌ Failed to send OTP email       → Email lỗi
⚠️ Email service timeout          → Timeout
```

## Admin Support Script

Tạo script nhanh để lấy OTP:

```javascript
// admin-get-otp.js
const username = process.argv[2];
fetch(`https://tracnghiem-1.onrender.com/api/users/get-otp/${username}`, {
  headers: {
    'x-admin-key': 'YOUR_ADMIN_KEY'
  }
})
.then(r => r.json())
.then(data => console.log('OTP:', data.otp));
```

Dùng: `node admin-get-otp.js testuser`

## Next Steps

1. ✅ Code đã được update với timeout handling
2. ✅ Logs chi tiết hơn
3. ✅ API debug đã sẵn sàng
4. ⏳ Đợi Render deploy (2-3 phút)
5. 🔄 Test lại với đăng ký mới
6. 📧 Nếu vẫn timeout → Chuyển sang SendGrid
