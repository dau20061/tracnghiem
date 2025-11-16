# ❗ QUAN TRỌNG: Kiểm tra Brevo API Key trên Render

## Vấn đề hiện tại
Vẫn bị lỗi "Connection timeout" nghĩa là:
- **KHÔNG phải lỗi code** (đã thay HTTP API rồi)
- **Có thể thiếu hoặc sai API key** trên Render

## ✅ Các bước kiểm tra NGAY:

### 1️⃣ Kiểm tra logs trên Render
Vào Render Dashboard → Logs → Tìm dòng này khi server khởi động:

**✅ ĐÚNG - Thấy dòng này:**
```
============================================================
🔍 EMAIL SERVICE INITIALIZATION
============================================================
  Mode: Brevo HTTP API Only (No SMTP)
  BREVO_API_KEY: ✅ CONFIGURED
  Sender Email: dauvo041@gmail.com
  Sender Name: TracNghiem Platform
============================================================
✅ Email service ready - Using Brevo HTTP API
```

**❌ SAI - Thấy dòng này:**
```
  BREVO_API_KEY: ❌ MISSING
```
→ Nghĩa là chưa thêm API key vào Render

---

### 2️⃣ Lấy ĐÚNG loại API key từ Brevo

⚠️ **CHÚ Ý: CÓ 2 LOẠI KEY, PHẢI DÙNG ĐÚNG!**

#### 🔴 SAI - Không dùng SMTP key:
```
SMTP Key: smtp-xxxxxxxxxxx
```
❌ **Key này KHÔNG DÙNG ĐƯỢC** với HTTP API

#### ✅ ĐÚNG - Dùng API v3 key:
```
API Key: xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxx
```
✅ **Bắt đầu bằng `xkeysib-`** - Đây mới là key đúng!

---

### 3️⃣ Cách lấy API v3 Key:

1. Vào https://app.brevo.com/
2. Click vào tên tài khoản (góc phải trên)
3. Chọn **"SMTP & API"**
4. Tab **"API Keys"** (KHÔNG phải "SMTP")
5. Nếu chưa có key → Click **"Create a new API key"**
6. Nhập tên: `TracNghiem Production`
7. Copy key (bắt đầu bằng `xkeysib-`)

---

### 4️⃣ Thêm vào Render Environment Variables:

1. Vào Render Dashboard: https://dashboard.render.com/
2. Chọn service **tracnghiem-1** (backend)
3. Tab **"Environment"**
4. Thêm/Sửa các biến này:

```
BREVO_API_KEY = xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxx
BREVO_USER = dauvo041@gmail.com
EMAIL_FROM_NAME = TracNghiem Platform
```

5. Click **"Save Changes"** (Service sẽ tự động restart)

---

### 5️⃣ Kiểm tra lại sau khi thêm key:

Đợi 1-2 phút để Render restart, sau đó:

1. Vào **Logs** trên Render
2. Tìm dòng khởi động email service
3. Phải thấy: `BREVO_API_KEY: ✅ CONFIGURED`

4. Thử đăng ký tài khoản mới
5. Xem logs khi gửi email - phải thấy:
```
📤 SENDING EMAIL
   To: test@example.com
   Subject: 🔐 Mã xác thực OTP - TracNghiem Platform
   From: TracNghiem Platform <dauvo041@gmail.com>
✅ EMAIL SENT SUCCESSFULLY!
   Message ID: <xxx>
```

---

## 🔍 Debug nếu vẫn lỗi:

### Nếu thấy "BREVO_API_KEY: ✅ CONFIGURED" nhưng vẫn timeout:

1. **Kiểm tra API key có đúng không:**
   - Copy key từ Render Environment
   - Paste vào notepad
   - Kiểm tra có bắt đầu bằng `xkeysib-`?
   - Có thừa khoảng trắng đầu/cuối không?

2. **Test API key bằng curl:**
```bash
curl --request GET \
  --url https://api.brevo.com/v3/account \
  --header 'accept: application/json' \
  --header 'api-key: YOUR_API_KEY'
```
Nếu trả về thông tin account → Key đúng
Nếu lỗi 401 → Key sai

3. **Kiểm tra sender email:**
   - `dauvo041@gmail.com` phải được verify trong Brevo
   - Vào Brevo → Senders → Phải thấy email này với status "Active"

---

## 📞 Nếu vẫn không được:

Gửi cho tôi:
1. Screenshot phần Environment Variables trên Render (che bớt key, chỉ cần thấy tên biến)
2. Screenshot logs khi server khởi động
3. Screenshot logs khi gửi email
4. Xác nhận email `dauvo041@gmail.com` đã verify chưa

---

## ⏰ Timeline dự kiến:
- Thêm key: 1 phút
- Render restart: 1-2 phút
- Test email: 30 giây
- **Tổng: ~3-4 phút** là xong!
