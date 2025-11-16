# Hướng dẫn kiểm tra và sửa lỗi Email không gửi trên Render

## Vấn đề hiện tại
- Email service test local thành công ✅
- Backend Render đang chạy ✅
- Nhưng email không được gửi khi đăng ký ❌

## Nguyên nhân có thể

### 1. Thiếu biến môi trường trên Render

**Cách kiểm tra:**
1. Vào [Render Dashboard](https://dashboard.render.com/)
2. Chọn service backend của bạn
3. Vào tab **Environment**
4. Kiểm tra có đầy đủ các biến sau không:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=dauvo041@gmail.com
EMAIL_PASS=busa vpnw xtwm npmf
EMAIL_FROM_NAME=TracNghiem Platform
```

**Nếu thiếu:**
- Click **Add Environment Variable**
- Thêm từng biến một
- Click **Save Changes**
- Backend sẽ tự động restart

### 2. Gmail chặn đăng nhập từ Render

**Cách kiểm tra logs:**
1. Vào service backend trên Render
2. Click tab **Logs**
3. Tìm các dòng khi có người đăng ký:
   - `📧 OTP sent to...` → Email gửi thành công
   - `❌ Email service error:` → Có lỗi
   - `Failed to send OTP email:` → Chi tiết lỗi

**Các lỗi thường gặp:**

#### Lỗi: "Invalid login: 534-5.7.9 Application-specific password required"
**Nguyên nhân:** Gmail yêu cầu App Password thay vì password thường

**Giải pháp:**
1. Đảm bảo đang dùng App Password (đã có: `busa vpnw xtwm npmf`)
2. Kiểm tra 2-Step Verification đã bật chưa:
   - Vào https://myaccount.google.com/security
   - Bật "2-Step Verification"
   - Tạo App Password mới nếu cần

#### Lỗi: "Connection timeout" hoặc "ETIMEDOUT"
**Nguyên nhân:** Render không thể kết nối SMTP

**Giải pháp:**
- Gmail SMTP có thể bị chặn từ một số IP
- Thử đổi sang dịch vụ email khác (SendGrid, Mailgun, AWS SES)

#### Lỗi: "self signed certificate"
**Nguyên nhân:** Vấn đề SSL

**Giải pháp:** Cập nhật config trong `emailService.js`:
```javascript
this.transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false  // Thêm dòng này
  }
});
```

### 3. Email service chưa được verify khi khởi động

**Kiểm tra logs khởi động:**
Tìm dòng:
- ✅ `Email service ready` → OK
- ❌ `Email service error:` → Có vấn đề

**Nếu lỗi:** Xem chi tiết lỗi trong logs

## Cách test nhanh

### Test 1: Kiểm tra API health
```bash
curl https://tracnghiem-1.onrender.com/api/health
```
Kết quả: `{"ok":true}` → Backend chạy tốt ✅

### Test 2: Thử đăng ký tài khoản test
1. Mở http://localhost:5174 (hoặc port frontend đang chạy)
2. Đăng ký với email thật của bạn
3. Ngay lập tức vào Render logs xem có:
   - `📧 OTP sent to [email]`
   - Hoặc lỗi gì

### Test 3: Kiểm tra email có vào Spam không
1. Kiểm tra thư mục **Spam/Junk** của email
2. Gmail có thể đánh dấu email tự động là spam

## Giải pháp tạm thời: Dùng SendGrid (Miễn phí)

Nếu Gmail không hoạt động trên Render, dùng SendGrid:

### 1. Đăng ký SendGrid
- Vào https://sendgrid.com/
- Đăng ký tài khoản miễn phí (100 emails/ngày)
- Verify email

### 2. Tạo API Key
- Vào Settings → API Keys
- Create API Key
- Copy key (chỉ hiện 1 lần)

### 3. Cập nhật Environment Variables trên Render
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxx
EMAIL_FROM=dauvo041@gmail.com
EMAIL_FROM_NAME=TracNghiem Platform
```

### 4. Cập nhật `emailService.js`
```javascript
import sgMail from '@sendgrid/mail';

class EmailService {
  constructor() {
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.useSendGrid = true;
    } else {
      // Gmail SMTP code hiện tại
      this.transporter = nodemailer.createTransport({...});
      this.useSendGrid = false;
    }
  }
  
  async sendOTPEmail(userEmail, userName, otp) {
    if (this.useSendGrid) {
      // Dùng SendGrid
      const msg = {
        to: userEmail,
        from: process.env.EMAIL_FROM,
        subject: '🔐 Mã xác thực OTP',
        html: this.generateOTPHTML(userName, otp)
      };
      return await sgMail.send(msg);
    } else {
      // Dùng SMTP như cũ
      // ...existing code...
    }
  }
}
```

### 5. Install SendGrid
```bash
npm install @sendgrid/mail
```

## Checklist kiểm tra

- [ ] Kiểm tra Environment Variables trên Render có đầy đủ
- [ ] Kiểm tra Render Logs khi đăng ký
- [ ] Kiểm tra email Spam/Junk folder
- [ ] Test với email khác (không phải Gmail)
- [ ] Xem có lỗi SSL/TLS không
- [ ] Thử restart service trên Render
- [ ] Nếu không được, chuyển sang SendGrid

## Debug ngay bây giờ

**Bước 1:** Mở Render Dashboard và xem Logs

**Bước 2:** Thử đăng ký 1 tài khoản test và xem logs real-time

**Bước 3:** Copy lỗi (nếu có) và tìm giải pháp tương ứng ở trên

---

**Lưu ý:** Gmail SMTP từ server cloud (như Render) có thể bị chặn. SendGrid/Mailgun được khuyến nghị cho production.
