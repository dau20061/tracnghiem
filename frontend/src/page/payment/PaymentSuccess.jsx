import React, { useEffect, useState } from "react";import { API_URL } from '../../config/api';

import { useNavigate, useSearchParams } from "react-router-dom";
import "./paymentSuccess.css";

const PLAN_LABELS = {
  day: "Gói 1 ngày",
  month: "Gói 1 tháng", 
  year: "Gói 1 năm",
};

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Lấy thông tin từ URL parameters
    const appTransId = searchParams.get("appTransId");
    const plan = searchParams.get("plan");
    const status = searchParams.get("status");

    if (!appTransId || status !== "paid") {
      // Nếu không có thông tin thanh toán hoặc status không phải "paid", redirect về trang chủ
      navigate("/", { replace: true });
      return;
    }

    setPaymentInfo({
      appTransId,
      plan: PLAN_LABELS[plan] || plan,
      planKey: plan
    });

    // Refresh user data để cập nhật membership
    const refreshUserData = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await fetch(`${API_URL}/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const userData = await response.json();
            if (userData?.user) {
              localStorage.setItem("user", JSON.stringify(userData.user));
              window.dispatchEvent(new Event("auth-changed"));
            }
          }
        } catch (error) {
          console.warn("Failed to refresh user data:", error);
        }
      }
    };

    refreshUserData();

    // Đếm ngược 5 giây rồi tự động chuyển về courses
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/courses");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, searchParams]);

  const goToCourses = () => {
    navigate("/courses");
  };

  const goToHome = () => {
    navigate("/");
  };

  if (!paymentInfo) {
    return (
      <div className="payment-success">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang xử lý...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success">
      <div className="success-container">
        <div className="success-animation">
          <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
            <path className="checkmark__check" fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>

        <h1 className="success-title">Thanh toán thành công! 🎉</h1>
        <p className="success-description">
          Chúc mừng! Bạn đã nâng cấp thành công. Hãy bắt đầu học tập ngay!
        </p>

        <div className="payment-details">
          <div className="detail-item">
            <span className="label">Gói đã mua:</span>
            <span className="value">{paymentInfo.plan}</span>
          </div>
          <div className="detail-item">
            <span className="label">Mã giao dịch:</span>
            <span className="value">{paymentInfo.appTransId.slice(-8)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Ngày thanh toán:</span>
            <span className="value">{new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        <div className="success-actions">
          <button 
            className="btn btn-primary btn-large" 
            onClick={goToCourses}
          >
            🚀 Bắt đầu học tập
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={goToHome}
          >
            🏠 Về trang chủ
          </button>
        </div>

        <div className="auto-redirect">
          <p>Tự động chuyển đến khóa học sau {countdown} giây</p>
          <div className="countdown-bar">
            <div 
              className="countdown-progress" 
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}