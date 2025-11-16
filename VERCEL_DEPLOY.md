# Deploy Frontend lên Vercel

## Bước 1: Chuẩn bị
1. Đăng ký tài khoản tại https://vercel.com
2. Cài đặt Vercel CLI (tuỳ chọn):
   ```bash
   npm install -g vercel
   ```

## Bước 2: Deploy qua Vercel Dashboard (Khuyến nghị)

### 2.1. Import từ Git
1. Truy cập https://vercel.com/new
2. Chọn "Import Git Repository"
3. Kết nối GitHub và chọn repo `tracnghiem`

### 2.2. Cấu hình Project
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.3. Environment Variables
Thêm biến môi trường:
- Key: `VITE_API_URL`
- Value: `https://your-backend.onrender.com` (URL backend trên Render)

### 2.4. Deploy
Nhấn "Deploy" và đợi build hoàn tất (~1-2 phút)

## Bước 3: Deploy qua CLI (Tuỳ chọn)

```bash
# Trong thư mục gốc dự án
cd frontend
vercel

# Hoặc deploy production
vercel --prod
```

## Bước 4: Cấu hình Domain (Tuỳ chọn)
1. Vào Settings > Domains
2. Thêm custom domain hoặc dùng domain mặc định: `your-app.vercel.app`

## Bước 5: Cập nhật Backend CORS
Thêm domain Vercel vào CORS trong backend:
```javascript
// backend/server.js
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app'  // Thêm domain Vercel
  ],
  credentials: true
};
```

## Cấu trúc Project đã setup:
```
tracnghiem/
├── frontend/           # React app sẽ deploy lên Vercel
│   ├── dist/          # Build output
│   ├── src/
│   └── package.json
├── backend/           # Node.js API (deploy riêng trên Render)
├── vercel.json        # Cấu hình Vercel
└── .vercelignore      # Ignore files
```

## Auto Deploy
Sau khi setup, mỗi khi push code lên GitHub:
- Push lên `main` → auto deploy production
- Push lên branch khác → auto deploy preview

## Kiểm tra sau deploy
1. Mở URL Vercel được cung cấp
2. Test đăng nhập/đăng ký
3. Test các chức năng quiz
4. Kiểm tra console browser xem có lỗi CORS không

## Troubleshooting

### Lỗi: Cannot find module 'vite'
Chạy `npm install` trong folder `frontend`

### Lỗi: API connection failed
- Kiểm tra `VITE_API_URL` đã đúng chưa
- Kiểm tra backend CORS đã thêm domain Vercel chưa

### Lỗi: 404 on refresh
Đã configure trong `vercel.json` với SPA fallback

## URLs sau deploy
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com` (không đổi)

## Tài khoản admin mặc định
- Username: `admin`
- Password: `123456`
- Quyền: truy cập toàn bộ trang `/admin` để quản lý quiz, user, doanh thu
- Ghi chú: tài khoản này được tạo tự động khi backend khởi động; hãy đổi mật khẩu trong môi trường production nếu cần bảo mật cao hơn
