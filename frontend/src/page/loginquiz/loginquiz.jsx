// ...existing code...
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../../config/api";
import "./login.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("login");
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || "/";
  const quizId = useMemo(() => {
    if (typeof fromPath === "string" && fromPath.startsWith("/quiz/")) {
      return fromPath.split("/")[2] || "";
    }
    return "";
  }, [fromPath]);

  const saveAuth = (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("auth-changed"));
  };

  const handleLogin = async () => {
    const res = await fetch(`${API_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Đăng nhập thất bại");
    
    // Kiểm tra nếu tài khoản cần xác thực OTP
    if (data.needsVerification) {
      setNotice("Tài khoản chưa được xác thực. Vui lòng kiểm tra email và nhập mã OTP.");
      setTimeout(() => {
        navigate("/verify-otp", { state: { username } });
      }, 2000);
      return;
    }
    
    saveAuth(data.token, data.user);
    const next = typeof fromPath === "string" && fromPath && fromPath !== "/login"
      ? fromPath
      : "/";
    navigate(next, { replace: true });
  };

  const handleRegister = async () => {
    if (pwd.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự");
    if (pwd !== confirm) throw new Error("Mật khẩu nhập lại không khớp");
    if (!EMAIL_REGEX.test(email.trim())) throw new Error("Email không hợp lệ");
    const res = await fetch(`${API_URL}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: pwd, email: email.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Đăng ký thất bại");
    
    // Hiển thị thông báo và chuyển hướng đến trang xác thực OTP
    setNotice("Mã OTP đã được gửi đến email. Vui lòng xác thực để hoàn tất đăng ký...");
    setTimeout(() => {
      navigate("/verify-otp", { state: { username } });
    }, 1500);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "login") {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="logo">QZ</div>
          <div className="brand-text">
            <h1 className="title">QUIZ TRẮC NGHIỆM</h1>
            <p className="subtitle">
              {mode === "login" ? "Vui lòng đăng nhập để truy cập" : "Tạo tài khoản để bắt đầu"}
            </p>
            {quizId && (
              <p className="subtitle" style={{ marginTop: 4 }}>
                <strong>Bài:</strong> #{quizId}
              </p>
            )}
          </div>
        </div>

        <form className="form" onSubmit={onSubmit}>
          <label className="label" htmlFor="username">Tài khoản</label>
          <input
            id="username"
            type="text"
            className="input"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label className="label" htmlFor="pwd">Mật khẩu</label>
          <input
            id="pwd"
            type="password"
            className="input"
            placeholder="••••••••"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            required
          />

          {mode === "register" && (
            <>
              <label className="label" htmlFor="email">Gmail</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label className="label" htmlFor="confirm">Nhập lại mật khẩu</label>
              <input
                id="confirm"
                type="password"
                className="input"
                placeholder="Nhập lại mật khẩu"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </>
          )}

          {notice && <div style={{ color: "#16a34a", fontSize: 13 }}>{notice}</div>}
          {err && <div style={{ color: "#dc2626", fontSize: 13 }}>{err}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <div className="foot">
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <button className="btn-switch" type="button" onClick={() => { setMode("register"); setErr(""); setNotice(""); }}>
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <button className="btn-switch" type="button" onClick={() => { setMode("login"); setErr(""); }}>
                Đăng nhập
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}