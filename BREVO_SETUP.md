# Setup Brevo (Sendinblue) - Email Service miễn phí cho Render

## Tại sao Brevo?
- ✅ **300 emails/ngày MIỄN PHÍ**
- ✅ Hoạt động ổn định với Render
- ✅ Không bị chặn như Gmail
- ✅ Setup đơn giản (5 phút)
- ✅ Dashboard theo dõi email

## Bước 1: Đăng ký Brevo (2 phút)

1. Vào https://www.brevo.com/
2. Click **Sign up free**
3. Điền thông tin:
   - Email: `dauvo041@gmail.com`
   - Password: (tạo mới)
4. Verify email (check inbox)
5. Hoàn tất đăng ký

## Bước 2: Lấy SMTP API Key (1 phút)

1. Đăng nhập vào Brevo
2. Click tên bạn (góc phải) → **SMTP & API**
3. Tab **SMTP**
4. Tìm **SMTP Key** hoặc click **Create a new SMTP key**
5. Copy API key (dạng: `xkeysib-xxxxxxxxxxxxx`)

## Bước 3: Cập nhật Render Environment Variables (2 phút)

1. Vào [Render Dashboard](https://dashboard.render.com/)
2. Chọn **backend service**
3. Tab **Environment**
4. Click **Add Environment Variable**

Thêm các biến sau:

```env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx (paste key vừa copy)
BREVO_USER=dauvo041@gmail.com
EMAIL_FROM_NAME=TracNghiem Platform
```

5. Click **Save Changes**
6. Backend sẽ tự động **restart** (đợi 1-2 phút)

## Bước 4: Test (30 giây)

1. Đợi Render restart xong
2. Vào http://localhost:5174
3. Đăng ký tài khoản test
4. **Kiểm tra email** → Sẽ nhận được OTP!

## Verify Email Sender (Khuyến nghị)

Để email không bị spam:

1. Vào Brevo → **Senders**
2. Click **Add a sender**
3. Nhập: `dauvo041@gmail.com`
4. Verify qua email
5. Xong!

## Config hiện tại

Code đã tự động detect:
- Nếu có `BREVO_API_KEY` → Dùng Brevo
- Nếu không → Dùng Gmail (như cũ)

## Kiểm tra logs

Sau khi restart, logs sẽ hiển thị:
```
📧 Using Brevo SMTP          → Đang dùng Brevo
✅ Email service ready       → Kết nối OK
📧 OTP email sent: xxx       → Email đã gửi
```

## Tính năng Brevo Dashboard

- Xem tất cả emails đã gửi
- Tracking: open rate, click rate
- Xem logs chi tiết
- Quản lý templates

## Free Plan Limits

- 300 emails/ngày
- Unlimited contacts
- Email templates
- SMTP & API

→ **Đủ cho development và production nhỏ!**

## Alternative Options

Nếu cần nhiều hơn 300 emails/ngày:

### 1. **SendGrid** (100/day free)
```env
SENDGRID_API_KEY=SG.xxxxx
```

### 2. **Mailgun** (5000/month free)
```env
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=xxx
```

### 3. **AWS SES** (62,000/month free nếu dùng EC2)
```env
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

## Troubleshooting

### "Invalid API key"
- Kiểm tra copy đúng key
- Không có khoảng trắng
- Key phải là SMTP key, không phải API v3 key

### "Sender not verified"
- Vào Brevo → Senders
- Verify email sender

### Vẫn không nhận email
- Kiểm tra Spam folder
- Kiểm tra Render logs
- Verify sender email

## Next Steps

1. ✅ Đăng ký Brevo: https://www.brevo.com/
2. ✅ Lấy SMTP API Key
3. ✅ Add vào Render Environment
4. ✅ Đợi restart
5. ✅ Test đăng ký!

---

**⏱️ Tổng thời gian: 5 phút**

**💰 Chi phí: $0 (miễn phí)**

**🎯 Kết quả: Email hoạt động 100%**
