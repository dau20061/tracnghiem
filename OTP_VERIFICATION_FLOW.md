# Luồng Xác Thực OTP (OTP Verification Flow)

## Tổng quan
Hệ thống yêu cầu người dùng **bắt buộc phải xác thực email qua mã OTP** trước khi có thể sử dụng tài khoản.

## Quy trình đăng ký mới

### 1. Đăng ký tài khoản
- Người dùng điền form: `username`, `email`, `password`, `confirm password`
- Frontend gửi request đến `POST /api/users/register`
- Backend:
  - Tạo tài khoản với trạng thái `isVerified: false`, `accountStatus: "pending"`
  - Tạo mã OTP 6 số ngẫu nhiên
  - Lưu OTP và thời gian hết hạn (10 phút)
  - Gửi email chứa mã OTP
  - Trả về response với `needsVerification: true`

### 2. Xác thực OTP
- Frontend tự động chuyển hướng đến trang `/verify-otp`
- Người dùng nhập mã OTP 6 số từ email
- Frontend gửi request đến `POST /api/users/verify-otp`
- Backend:
  - Kiểm tra OTP có đúng không
  - Kiểm tra OTP còn hạn không (10 phút)
  - Nếu đúng:
    - Cập nhật `isVerified: true`, `accountStatus: "active"`
    - Xóa OTP khỏi database
    - Gửi email chào mừng
    - Trả về JWT token
- Frontend:
  - Lưu token và user info vào localStorage
  - Hiển thị thông báo thành công
  - Chuyển hướng về trang chủ

### 3. Gửi lại OTP
- Nếu không nhận được email hoặc OTP hết hạn
- Người dùng click nút "Gửi lại mã OTP"
- Frontend gửi request đến `POST /api/users/resend-otp`
- Backend:
  - Tạo OTP mới
  - Cập nhật thời gian hết hạn mới (10 phút)
  - Gửi email mới
- Frontend hiển thí countdown 60 giây trước khi cho phép gửi lại

## Quy trình đăng nhập

### Đăng nhập với tài khoản chưa xác thực
- Người dùng điền `username` và `password`
- Frontend gửi request đến `POST /api/users/login`
- Backend:
  - Kiểm tra username/password
  - **Kiểm tra `isVerified`**
  - Nếu `isVerified = false`:
    - Trả về error 403 với `needsVerification: true`
    - Message: "Tài khoản chưa được xác thực. Vui lòng kiểm tra email và nhập mã OTP"
- Frontend:
  - Hiển thị thông báo
  - Tự động chuyển hướng đến `/verify-otp` sau 2 giây

### Đăng nhập với tài khoản đã xác thực
- Backend kiểm tra `isVerified = true`
- Tạo JWT token và trả về
- Frontend lưu token và chuyển hướng vào hệ thống

## Bảo mật

### OTP
- 6 số ngẫu nhiên
- Hết hạn sau 10 phút
- Được mã hóa trong database (nếu cần)
- Chỉ được sử dụng 1 lần
- Sau khi xác thực, OTP bị xóa khỏi database

### Email
- Validate format email trước khi lưu
- Chuyển về lowercase và trim whitespace
- Unique - không cho phép trùng email

### Token
- JWT token với thời gian sống 12 giờ
- Chứa thông tin: userId, username, email, role, membership
- Được yêu cầu cho mọi API cần authentication

## Trạng thái tài khoản

| Trường | Giá trị | Ý nghĩa |
|--------|---------|---------|
| `isVerified` | `false` | Chưa xác thực email, không thể đăng nhập |
| `isVerified` | `true` | Đã xác thực, có thể sử dụng |
| `accountStatus` | `"pending"` | Đang chờ xác thực |
| `accountStatus` | `"active"` | Đã kích hoạt |
| `accountStatus` | `"disabled"` | Bị vô hiệu hóa bởi admin |
| `isDisabled` | `true` | Tài khoản bị khóa |

## API Endpoints

### POST /api/users/register
Request:
```json
{
  "username": "user123",
  "password": "password123",
  "email": "user@example.com"
}
```

Response (201):
```json
{
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
  "user": {
    "id": "...",
    "username": "user123",
    "email": "user@example.com",
    "needsVerification": true,
    "isVerified": false,
    "accountStatus": "pending"
  }
}
```

### POST /api/users/verify-otp
Request:
```json
{
  "username": "user123",
  "otp": "123456"
}
```

Response (200):
```json
{
  "message": "Xác thực thành công!",
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "username": "user123",
    "email": "user@example.com",
    "isVerified": true,
    "accountStatus": "active"
  }
}
```

### POST /api/users/resend-otp
Request:
```json
{
  "username": "user123"
}
```

Response (200):
```json
{
  "message": "Đã gửi lại mã OTP. Vui lòng kiểm tra email"
}
```

### POST /api/users/login
Request:
```json
{
  "username": "user123",
  "password": "password123"
}
```

Response nếu chưa xác thực (403):
```json
{
  "message": "Tài khoản chưa được xác thực. Vui lòng kiểm tra email và nhập mã OTP",
  "needsVerification": true,
  "username": "user123"
}
```

Response nếu đã xác thực (200):
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "username": "user123",
    "email": "user@example.com",
    "isVerified": true,
    "accountStatus": "active",
    "membershipLevel": "free"
  }
}
```

## UI/UX

### Trang đăng ký
- Form đăng ký cơ bản
- Sau khi submit thành công: hiển thị thông báo "Đã gửi mã OTP đến email của bạn"
- Tự động chuyển hướng đến `/verify-otp` sau 1.5 giây

### Trang xác thực OTP
- Input 6 số cho OTP
- Icon email để nhắc người dùng kiểm tra hộp thư
- Hướng dẫn rõ ràng
- Nút "Gửi lại OTP" với countdown 60 giây
- Hiển thị lỗi nếu OTP sai hoặc hết hạn
- Hiển thị thành công khi xác thực
- Nút quay lại trang login

### Trang đăng nhập
- Nếu tài khoản chưa xác thực: hiển thị thông báo và tự động chuyển đến `/verify-otp`
- Nếu đã xác thực: đăng nhập bình thường

## Email Templates

### Email OTP
- Subject: "Mã xác thực tài khoản Quiz Trắc Nghiệm"
- Nội dung:
  - Chào username
  - Mã OTP 6 số (font to, rõ ràng)
  - Hết hạn sau 10 phút
  - Link quay lại trang xác thực
  - Lưu ý bảo mật

### Email chào mừng
- Subject: "Chào mừng đến với Quiz Trắc Nghiệm"
- Nội dung:
  - Chúc mừng đăng ký thành công
  - Giới thiệu các tính năng
  - Hướng dẫn sử dụng
  - Thông tin hỗ trợ

## Kiểm thử

### Test cases cần kiểm tra
1. ✅ Đăng ký với email hợp lệ
2. ✅ Nhận được email OTP
3. ✅ Xác thực với OTP đúng
4. ❌ Xác thực với OTP sai
5. ❌ Xác thực với OTP đã hết hạn
6. ✅ Gửi lại OTP
7. ❌ Đăng nhập trước khi xác thực
8. ✅ Đăng nhập sau khi xác thực
9. ❌ Đăng ký với email trùng
10. ❌ Đăng ký với username trùng

## Troubleshooting

### Không nhận được email
1. Kiểm tra spam/junk folder
2. Kiểm tra email service configuration
3. Kiểm tra logs backend
4. Dùng nút "Gửi lại OTP"

### OTP không hợp lệ
1. Kiểm tra OTP còn hạn không (10 phút)
2. Đảm bảo nhập đúng 6 số
3. Không có khoảng trắng
4. Gửi lại OTP mới

### Không thể đăng nhập
1. Kiểm tra tài khoản đã xác thực chưa
2. Nếu chưa, vào `/verify-otp` để xác thực
3. Kiểm tra username/password
4. Kiểm tra tài khoản có bị disabled không
