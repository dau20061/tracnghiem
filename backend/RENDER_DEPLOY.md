# Render Deployment Guide - Backend

## Bước 1: Tạo MongoDB Atlas Database

1. Truy cập https://cloud.mongodb.com
2. Tạo cluster miễn phí
3. Lấy connection string (ví dụ: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)

## Bước 2: Deploy lên Render

1. **Truy cập Render**: https://render.com
2. **Đăng nhập** bằng GitHub
3. **Tạo Web Service mới**:
   - Click "New +" → "Web Service"
   - Connect repository của bạn
   - Chọn branch `main`

4. **Cấu hình Service**:
   - **Name**: `tracnghiem-backend` (hoặc tên bất kỳ)
   - **Region**: Singapore (gần Việt Nam nhất)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

5. **Thêm Environment Variables**:
   
   Click "Add Environment Variable" và thêm các biến sau:

   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
   JWT_SECRET=your-random-secret-key-here-make-it-long-and-secure
   PORT=4000
   HOST=0.0.0.0
   
   # ZaloPay (nếu dùng)
   ZALOPAY_APP_ID=your-app-id
   ZALOPAY_KEY1=your-key1
   ZALOPAY_KEY2=your-key2
   ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
   ZALOPAY_CALLBACK_URL=https://your-app-name.onrender.com/api/payments/zalopay-callback
   
   # Email (optional)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=Quiz System <your-email@gmail.com>
   
   # Admin Key (optional)
   ADMIN_API_KEY=admin-secret-key
   ```

6. **Deploy**:
   - Click "Create Web Service"
   - Chờ 5-10 phút để deploy
   - Sau khi deploy xong, bạn sẽ có URL như: `https://tracnghiem-backend.onrender.com`

## Bước 3: Test Backend

Truy cập: `https://your-app-name.onrender.com/api/health`

Nếu thấy `{"ok":true}` là thành công!

## Bước 4: Cập nhật Frontend

Trong frontend, cập nhật các file để sử dụng backend URL mới:
- Tạo file `.env` trong `frontend/`:
  ```
  VITE_API_URL=https://your-app-name.onrender.com
  ```

## Lưu ý

- **Free tier của Render**: Service sẽ ngủ sau 15 phút không hoạt động, lần đầu truy cập sẽ chậm ~30s
- **MongoDB Atlas**: Cần whitelist IP `0.0.0.0/0` để Render có thể kết nối
- **ZALOPAY_CALLBACK_URL**: Phải là URL public của backend trên Render

## Troubleshooting

### Lỗi: "Cannot connect to MongoDB"
- Kiểm tra MONGO_URI đúng chưa
- Whitelist IP 0.0.0.0/0 trong MongoDB Atlas → Network Access

### Lỗi: "Build failed"
- Kiểm tra **Root Directory** = `backend`
- Kiểm tra **Build Command** = `npm install`

### Lỗi: "Application failed to respond"
- Kiểm tra biến `PORT` và `HOST=0.0.0.0`
- Xem logs trong Render dashboard
