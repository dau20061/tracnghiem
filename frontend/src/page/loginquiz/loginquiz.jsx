// ...existing code...
import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail]   = useState("");   // hoặc username
  const [pwd, setPwd]       = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const quizId = useMemo(() => sp.get("quiz") || "", [sp]);

  // ... các import & state như bạn đang có
const onSubmit = async (e) => {
  e.preventDefault();
  setErr("");
  setLoading(true);
  try {
    const res = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, username: email, password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Đăng nhập thất bại");

    // Lưu token (và quizId)
    localStorage.setItem("token", data.token);
    // 👉 chuyển sang trang làm bài
    navigate(`/quiz/${quizId}`);
  } catch (e) {
    setErr(e.message);
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
            <p className="subtitle">Vui lòng đăng nhập để truy cập</p>
            {quizId && (
              <p className="subtitle" style={{ marginTop: 4 }}>
                <strong>Bài:</strong> #{quizId}
              </p>
            )}
          </div>
        </div>

        <form className="form" onSubmit={onSubmit}>
          <label className="label" htmlFor="email">Tài khoản</label>
          <input
            id="email"
            type="text"
            className="input"
            placeholder="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

          {err && <div style={{ color: "#dc2626", fontSize: 13 }}>{err}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}