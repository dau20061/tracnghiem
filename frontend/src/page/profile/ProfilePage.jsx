import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config/api";
import "./profile.css";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Không đọc được user từ localStorage", error);
    return null;
  }
};

export default function ProfilePage() {
  const [user, setUser] = useState(() => getStoredUser());
  const [otpStatus, setOtpStatus] = useState({ type: "", message: "" });
  const [changeStatus, setChangeStatus] = useState({ type: "", message: "" });
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [changing, setChanging] = useState(false);
  const [form, setForm] = useState({ otp: "", newPassword: "", confirmPassword: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let cancelled = false;
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (error) {
        console.warn("Không lấy được thông tin hồ sơ", error);
      }
    };
    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestOtp = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setLoadingOtp(true);
    setOtpStatus({ type: "", message: "" });
    try {
      const res = await fetch(`${API_URL}/api/users/request-password-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setOtpStatus({ type: "success", message: data.message || "Đã gửi mã OTP." });
      } else {
        setOtpStatus({ type: "error", message: data.message || "Không gửi được OTP." });
      }
    } catch (error) {
      setOtpStatus({ type: "error", message: "Có lỗi khi gửi OTP. Vui lòng thử lại." });
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setChangeStatus({ type: "", message: "" });

    if (!form.newPassword || form.newPassword.length < 6) {
      setChangeStatus({ type: "error", message: "Mật khẩu mới phải từ 6 ký tự." });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setChangeStatus({ type: "error", message: "Mật khẩu xác nhận không trùng khớp." });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setChanging(true);
    try {
      const res = await fetch(`${API_URL}/api/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: form.otp.trim(), newPassword: form.newPassword.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setChangeStatus({ type: "success", message: data.message || "Đổi mật khẩu thành công." });
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setChangeStatus({ type: "error", message: data.message || "Không đổi được mật khẩu." });
      }
    } catch (error) {
      setChangeStatus({ type: "error", message: "Có lỗi khi đổi mật khẩu." });
    } finally {
      setChanging(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card">Đang tải thông tin tài khoản...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1>Hồ sơ tài khoản</h1>
        <p className="profile-subtitle">Quản lý thông tin và đổi mật khẩu bảo mật bằng OTP.</p>

        <div className="profile-info-grid">
          <div>
            <div className="info-label">Username</div>
            <div className="info-value">{user.username}</div>
          </div>
          <div>
            <div className="info-label">Email</div>
            <div className="info-value">{user.email || "Chưa cập nhật"}</div>
          </div>
          <div>
            <div className="info-label">Gói hiện tại</div>
            <div className="info-value">{user.membershipLevel || "free"}</div>
          </div>
          <div>
            <div className="info-label">Trạng thái</div>
            <div className="info-value">{user.accountStatus || "pending"}</div>
          </div>
        </div>

        <div className="otp-section">
          <div>
            <h2>1. Yêu cầu mã OTP</h2>
            <p>Mã xác nhận sẽ gửi tới email đã đăng ký. Mỗi mã có hiệu lực 10 phút.</p>
          </div>
          <button className="primary" onClick={handleRequestOtp} disabled={loadingOtp}>
            {loadingOtp ? "Đang gửi..." : "Gửi mã OTP"}
          </button>
        </div>
        {otpStatus.message && (
          <div className={`status ${otpStatus.type}`}>{otpStatus.message}</div>
        )}

        <form className="password-form" onSubmit={handleChangePassword}>
          <h2>2. Nhập OTP và mật khẩu mới</h2>
          <label>
            Mã OTP
            <input
              type="text"
              name="otp"
              value={form.otp}
              onChange={handleInputChange}
              placeholder="Nhập mã gồm 6 số"
              maxLength={6}
              required
            />
          </label>
          <label>
            Mật khẩu mới
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleInputChange}
              placeholder="Tối thiểu 6 ký tự"
              required
            />
          </label>
          <label>
            Nhập lại mật khẩu
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleInputChange}
              placeholder="Nhập lại để xác nhận"
              required
            />
          </label>
          {changeStatus.message && (
            <div className={`status ${changeStatus.type}`}>{changeStatus.message}</div>
          )}
          <button type="submit" className="primary" disabled={changing}>
            {changing ? "Đang cập nhật..." : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}
