import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../../config/api";
import "./verifyOTP.css";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || "";

  useEffect(() => {
    if (!username) {
      navigate("/login");
    }
  }, [username, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Mã OTP phải có 6 số");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/users/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Xác thực thất bại");
      }

      // Lưu token và user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth-changed"));

      setSuccess("🎉 Đăng ký thành công! Tài khoản đã được kích hoạt. Đang chuyển hướng...");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResendLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/users/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Gửi lại OTP thất bại");
      }

      setSuccess(data.message || "Đã gửi lại mã OTP");
      setCountdown(60); // 60 giây countdown
      setOtp(""); // Clear OTP input
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="verify-otp-page">
      <div className="verify-otp-container">
        <div className="verify-otp-card">
          <div className="verify-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h1>Xác thực tài khoản</h1>
          <p className="verify-subtitle">
            Chúng tôi đã gửi mã xác thực gồm 6 số đến email của bạn.
            <br />
            Vui lòng kiểm tra email và nhập mã bên dưới.
          </p>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>Mã OTP</label>
              <input
                type="text"
                className="otp-input"
                placeholder="000000"
                value={otp}
                onChange={handleOtpChange}
                maxLength={6}
                disabled={loading}
                autoFocus
              />
              <small className="input-hint">Nhập mã 6 số đã gửi đến email của bạn</small>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Đang xác thực..." : "Xác thực"}
            </button>
          </form>

          <div className="verify-footer">
            <p>Không nhận được mã?</p>
            <button
              type="button"
              className="btn-link"
              onClick={handleResend}
              disabled={resendLoading || countdown > 0}
            >
              {resendLoading ? "Đang gửi..." : countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi lại mã OTP"}
            </button>
          </div>

          <div className="back-to-login">
            <button onClick={() => navigate("/login")} className="btn-text">
              ← Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
