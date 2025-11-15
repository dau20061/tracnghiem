# Test Payment Flow

## Flow thanh toán hoàn chỉnh:

### 1. User chọn gói thanh toán (/upgrade)
- Chọn gói (day/month/year)
- Click "Mua ngay"
- Redirect đến ZaloPay

### 2. Thanh toán thành công
- ZaloPay callback → backend
- Backend cập nhật user membership
- Backend cập nhật transaction status

### 3. User quay lại app (/payment/check)
- Kiểm tra status thanh toán
- Khi status = "paid" → Redirect đến /payment/success

### 4. Trang thanh toán thành công (/payment/success)
- Hiển thị thông báo thành công
- Hiển thị thông tin gói đã mua
- Nút "Bắt đầu làm bài ngay" → /courses
- Tự động redirect sau 5 giây

### 5. Trang khóa học (/courses)
- User có thể access tất cả bài thi
- Membership đã được cập nhật

## Test checklist:

□ Frontend payment flow works
□ Backend callback receives data correctly
□ Database updates user membership
□ Transaction status changes to "paid"
□ Redirect to success page works
□ Success page displays correct info
□ "Bắt đầu làm bài" button works
□ Auto-redirect to courses works
□ User can access courses after payment

## URLs để test:

- Upgrade: http://localhost:5173/upgrade
- Payment Check: http://localhost:5173/payment/check
- Payment Success: http://localhost:5173/payment/success?appTransId=123&status=paid&plan=month
- Courses: http://localhost:5173/courses

## Backend endpoints:

- Create order: POST /api/payments/zalopay/order
- Callback: POST /api/payments/zalopay/callback  
- Check status: GET /api/payments/zalopay/status/:appTransId