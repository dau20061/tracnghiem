# TEST FLOW MỚI - ZALOPAY PAYMENT

## 🔄 **Flow hoàn chỉnh:**

### 1. **User chọn gói (/upgrade)**
- Chọn gói thanh toán (day/month/year)
- Click "Mua ngay"
- Backend tạo order ZaloPay
- **ZaloPay mở TAB MỚI** để thanh toán
- **Redirect đến /payment/waiting** (trang chờ)

### 2. **Trang chờ (/payment/waiting)**
- Hiển thị thông tin gói đã chọn
- Hướng dẫn user thanh toán trên tab khác
- **Tự động poll status mỗi 2 giây**
- Hiển thị animation chờ đẹp mắt

### 3. **User thanh toán trên tab ZaloPay**
- Tab mới: ZaloPay payment gateway
- User hoàn tất thanh toán
- ZaloPay callback → backend
- Backend cập nhật status = "paid"

### 4. **Auto-detect thành công**
- Trang chờ detect status = "paid"
- Hiển thị thông báo "Thanh toán thành công!"
- **Auto redirect → /payment/success**

### 5. **Trang thành công (/payment/success)**
- Celebration animation đẹp
- Nút "Bắt đầu làm bài" → /courses
- Auto redirect sau 5 giây

## 🚀 **Các lệnh để test:**

### Khởi động servers:
```bash
# Backend (Terminal 1)
cd backend
npm start

# Frontend (Terminal 2)  
cd frontend
npm run dev

# Ngrok (Terminal 3) - nếu cần
ngrok http 4000
```

### Test URLs:
```
- Upgrade: http://localhost:5173/upgrade
- Waiting: http://localhost:5173/payment/waiting?appTransId=123&plan=month
- Success: http://localhost:5173/payment/success?appTransId=123&status=paid&plan=month
- Courses: http://localhost:5173/courses
```

## 🎯 **Key Features:**

✅ **ZaloPay tab mới**: Không chuyển hướng toàn bộ trang  
✅ **Trang chờ thông minh**: Auto-poll status mỗi 2s  
✅ **Real-time detection**: Detect callback success  
✅ **Beautiful UI**: Animations và UX mượt mà  
✅ **Auto flow**: Từ waiting → success → courses  
✅ **Mobile responsive**: Hoạt động tốt trên mobile  

## 🔧 **Debug:**

### Kiểm tra backend callback:
```bash
curl https://your-ngrok-url.ngrok.io/api/payments/test/callback
```

### Test polling status:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/payments/zalopay/status/TRANSACTION_ID
```

### Simulate payment success:
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"appTransId":"TRANSACTION_ID"}' \
  http://localhost:4000/api/payments/test/simulate-callback
```

## 📱 **User Experience:**

1. **Chọn gói** → **Tab mới ZaloPay** + **Trang chờ**
2. **Thanh toán** → **Auto-detect** → **Thông báo thành công**
3. **Click "Bắt đầu làm bài"** → **Courses page**

Perfect flow! 🎉