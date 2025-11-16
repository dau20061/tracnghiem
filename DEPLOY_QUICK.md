# 🚀 Deploy lên Vercel - Hướng dẫn nhanh

## Cách 1: Deploy qua Dashboard (Đơn giản nhất)

1. **Truy cập** https://vercel.com/new
2. **Import** repository GitHub này
3. **Cấu hình:**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables:**
   - `VITE_API_URL` = URL backend Render của bạn
5. **Deploy!**

## Cách 2: Deploy qua CLI

```bash
# Cài Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

## ⚠️ Quan trọng: Cập nhật CORS Backend

Sau khi deploy, thêm domain Vercel vào backend CORS:

```javascript
// backend/server.js - tìm phần corsOptions
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://tracnghiem.vercel.app'  // ← Thêm domain Vercel của bạn
  ],
  credentials: true
};
```

Sau đó redeploy backend trên Render.

## 🎉 Xong!

Frontend sẽ có URL: `https://your-project.vercel.app`

Mỗi lần push code lên GitHub, Vercel sẽ tự động build và deploy!
