import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./upgrade.css";

const plans = [
  {
    id: "day",
    title: "Gói 1 ngày",
    subtitle: "Truy cập mọi bài trong 24 giờ",
    price: "29.000đ",
    highlight: "Khởi động nhanh",
  },
  {
    id: "month",
    title: "Gói 1 tháng",
    subtitle: "Không giới hạn bài trong 30 ngày",
    price: "149.000đ",
    highlight: "Phổ biến",
    tag: "Best Value",
  },
  {
    id: "year",
    title: "Gói 1 năm",
    subtitle: "Tiết kiệm nhất cho học dài hạn",
    price: "1.390.000đ",
    highlight: "Full access",
  },
];

export default function UpgradePage() {
  const [loading, setLoading] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const navigate = useNavigate();

  const upgrade = async (plan) => {
    const token = localStorage.getItem("token");
    if (!token) {
  navigate("/login", { state: { from: "/upgrade" } });
      return;
    }
    setErr("");
    setDone("");
    setLoading(plan);
    try {
      const res = await fetch("http://localhost:4000/api/users/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
  navigate("/login", { state: { from: "/upgrade" } });
        return;
      }
      if (!res.ok) throw new Error(data?.message || "Nâng cấp thất bại");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
  window.dispatchEvent(new Event("auth-changed"));
      setDone("Nâng cấp thành công! Bạn đã mở khóa toàn bộ bài kiểm tra.");
      setTimeout(() => navigate("/courses"), 1200);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="upgrade-page">
      <div className="upgrade-head">
        <h1>Nâng cấp quyền truy cập</h1>
        <p>Chọn gói phù hợp để bắt đầu làm tất cả các bài kiểm tra trên hệ thống.</p>
      </div>

      {err && <div className="upgrade-alert error">{err}</div>}
      {done && <div className="upgrade-alert success">{done}</div>}

      <div className="plan-grid">
        {plans.map((plan) => (
          <article key={plan.id} className={`plan-card ${plan.id === "month" ? "featured" : ""}`}>
            {plan.tag && <div className="plan-tag">{plan.tag}</div>}
            <h2>{plan.title}</h2>
            <p className="plan-sub">{plan.subtitle}</p>
            <div className="plan-price">{plan.price}</div>
            <ul className="plan-list">
              <li>✔ Toàn bộ đề thi & quiz</li>
              <li>✔ Theo dõi tiến độ chi tiết</li>
              <li>✔ Hỗ trợ ưu tiên</li>
              <li>✔ {plan.highlight}</li>
            </ul>
            <button
              className="btn-upgrade"
              disabled={loading === plan.id}
              onClick={() => upgrade(plan.id)}
            >
              {loading === plan.id ? "Đang xử lý..." : "Nâng cấp ngay"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
