# 🚀 Hướng dẫn setup Resend - Email API đơn giản

## ✅ Ưu điểm của Resend:
- 🆓 **Miễn phí 100 emails/ngày** (3,000/tháng)
- ⚡ **Cực kỳ đơn giản** - chỉ cần 1 API key
- 🎯 **Chắc chắn hoạt động** trên Render
- 📧 **Email mặc định miễn phí**: onboarding@resend.dev
- 🔒 **Không cần verify domain** để test

---

## 📝 Cách lấy API Key (2 phút):

### Bước 1: Đăng ký tài khoản
1. Vào: https://resend.com/
2. Click **"Start Building for Free"**
3. Đăng ký bằng email hoặc GitHub

### Bước 2: Lấy API Key
1. Sau khi đăng nhập, vào: https://resend.com/api-keys
2. Click **"Create API Key"**
3. Đặt tên: `TracNghiem Production`
4. Permissions: **Full Access** (hoặc Send Access)
5. Click **"Add"**
6. **Copy key ngay** (bắt đầu bằng `re_...`)
   ```
   re_123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZabcde
   ```

---

## 🔧 Thêm vào Render:

1. Vào Render Dashboard: https://dashboard.render.com/
2. Chọn service **tracnghiem-1** (backend)
3. Tab **"Environment"**
4. Thêm biến mới:
   ```
   Key: RESEND_API_KEY
   Value: re_123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZabcde
   ```
5. Click **"Save Changes"**
6. Đợi service restart (1-2 phút)

---

## ✅ Kiểm tra logs:

Sau khi restart, xem logs phải thấy:

```
============================================================
🔍 EMAIL SERVICE INITIALIZATION
============================================================
  Mode: Resend API (Simple & Reliable)
  RESEND_API_KEY: ✅ CONFIGURED
  Sender Email: onboarding@resend.dev
  Sender Name: TracNghiem Platform
============================================================
✅ Email service ready - Using Resend API
```

---

## 🎯 Test ngay:

1. Đăng ký tài khoản mới trên web
2. Email OTP sẽ được gửi từ: `TracNghiem Platform <onboarding@resend.dev>`
3. Check hộp thư **Inbox** hoặc **Spam**

---

## 📧 Lưu ý về Sender Email:

### Email miễn phí (test):
- **onboarding@resend.dev** - Miễn phí, không cần setup
- Có thể bị vào Spam
- Đủ dùng để test

### Email tùy chỉnh (production):
Nếu muốn dùng email riêng (ví dụ: `noreply@tracnghiem.com`):

1. Mua domain (ví dụ: tracnghiem.com)
2. Vào Resend Dashboard → **Domains** → **Add Domain**
3. Thêm DNS records vào domain của bạn
4. Verify domain
5. Đổi sender email trong code:
   ```javascript
   this.senderEmail = 'noreply@tracnghiem.com';
   ```

---

## 🔄 So sánh Brevo vs Resend:

| Feature | Brevo | Resend |
|---------|-------|--------|
| Free tier | 300/ngày | 100/ngày |
| Setup | Phức tạp | Cực đơn giản |
| Firewall blocking | Có thể bị | Không bị |
| Email mặc định | Không | Có (onboarding@resend.dev) |
| Verify domain | Bắt buộc | Không bắt buộc |

---

## ❓ Troubleshooting:

### Vấn đề: "RESEND_API_KEY: ❌ MISSING"
**Giải pháp:**
- Kiểm tra đã add key vào Render chưa
- Kiểm tra tên biến: `RESEND_API_KEY` (đúng chính tả)
- Click "Save Changes" sau khi thêm
- Đợi service restart xong

### Vấn đề: "Email không nhận được"
**Giải pháp:**
1. Check **Spam folder**
2. Đợi 1-2 phút (có thể delay)
3. Xem logs trên Render - phải thấy "✅ EMAIL SENT SUCCESSFULLY!"
4. Thử email khác (Gmail, Outlook...)

### Vấn đề: "403 Forbidden"
**Giải pháp:**
- API key sai hoặc hết hạn
- Tạo key mới trên Resend Dashboard
- Copy lại key đầy đủ (bắt đầu bằng `re_`)

---

## 🎉 Kết quả:

Sau khi setup đúng:
- ✅ Email OTP gửi **ngay lập tức** (< 5 giây)
- ✅ Không bị firewall chặn
- ✅ Không cần setup phức tạp
- ✅ **100% hoạt động trên Render**

---

## 📞 Support:

Nếu vẫn không được, gửi cho tôi:
1. Screenshot logs khi server khởi động
2. Screenshot logs khi gửi email
3. Xác nhận đã add `RESEND_API_KEY` vào Render
