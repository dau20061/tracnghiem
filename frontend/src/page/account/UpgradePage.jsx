import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config/api";
import "./upgrade.css";

const plans = [
  {
    id: "day",
    title: "Gói 3 lượt",
    subtitle: "3 lượt làm bài, mỗi lượt làm lại 5 lần",
    price: "29.000đ",
    highlight: "Khởi động nhanh",
    attempts: 3,
  },
  {
    id: "month",
    title: "Gói 20 lượt",
    subtitle: "20 lượt làm bài, mỗi lượt làm lại 5 lần",
    price: "149.000đ",
    highlight: "Phổ biến",
    tag: "Best Value",
    attempts: 20,
  },
  {
    id: "year",
    title: "Gói 200 lượt",
    subtitle: "200 lượt làm bài, mỗi lượt làm lại 5 lần",
    price: "1.390.000đ",
    highlight: "Tiết kiệm nhất",
    attempts: 200,
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
      localStorage.removeItem("zalopayAppTransId");
      localStorage.removeItem("zalopayQrCode");
      localStorage.removeItem("zalopayOrderUrl");
      const res = await fetch(`${API_URL}/api/payments/zalopay/order`, {
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
      if (!res.ok) {
        throw new Error(data?.message || "Không tạo được thanh toán");
      }
      if (!data?.orderUrl) {
        throw new Error("Thiếu đường dẫn thanh toán ZaloPay");
      }
      localStorage.setItem("zalopayAppTransId", data.appTransId);
      localStorage.setItem("zalopayPlan", plan); // Store plan for redirect
      if (data.qrCode) {
        localStorage.setItem("zalopayQrCode", data.qrCode);
      }
      if (data.orderUrl) {
        localStorage.setItem("zalopayOrderUrl", data.orderUrl);
      }
      
      // Mở ZaloPay trong tab mới
      window.open(data.orderUrl, '_blank');
      
      // Chuyển đến trang chờ
      navigate(`/payment/waiting?appTransId=${encodeURIComponent(data.appTransId)}&plan=${encodeURIComponent(plan)}`);
      
      setDone("Đang chuyển đến trang chờ...");
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
              <li>✔ {plan.attempts} lượt làm bài</li>
              <li>✔ Mỗi lượt làm lại 5 lần (bài không giới hạn thời gian)</li>
              <li>✔ Theo dõi tiến độ chi tiết</li>
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
