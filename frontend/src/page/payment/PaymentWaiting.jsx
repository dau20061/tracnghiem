import React, { useEffect, useState } from "react";
import { API_URL } from '../../config/api';

import { useNavigate, useSearchParams } from "react-router-dom";
import "./paymentWaiting.css";

const PLAN_LABELS = {
  day: "Gói 3 lượt",
  month: "Gói 20 lượt", 
  year: "Gói 200 lượt",
};

export default function PaymentWaiting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("waiting");
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [dots, setDots] = useState("");
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const appTransId = searchParams.get("appTransId");
    const plan = searchParams.get("plan");

    if (!appTransId || !plan) {
      navigate("/upgrade", { replace: true });
      return;
    }

    setPaymentInfo({
      appTransId,
      plan: PLAN_LABELS[plan] || plan,
      planKey: plan
    });

    // Animation for dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    // Check payment status every 2 seconds
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(
          `${API_URL}/api/payments/zalopay/status/${encodeURIComponent(appTransId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Payment status:", data);
          
          if (data.status === "paid") {
            setStatus("success");
            
            // Refresh user data
            try {
              const userResponse = await fetch(`${API_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData?.user) {
                  localStorage.setItem("user", JSON.stringify(userData.user));
                  window.dispatchEvent(new Event("auth-changed"));
                }
              }
            } catch (error) {
              console.warn("Failed to refresh user data:", error);
            }

            // Chuyển đến trang success sau 2 giây
            setTimeout(() => {
              navigate(`/payment/success?appTransId=${encodeURIComponent(appTransId)}&status=paid&plan=${encodeURIComponent(plan)}`);
            }, 2000);
            
          } else if (data.status === "failed") {
            setStatus("failed");
          }
        }
      } catch (error) {
        console.error("Check payment error:", error);
        setCheckCount(prev => prev + 1);
        
        // Nếu check lỗi quá nhiều lần, chuyển về upgrade
        if (checkCount > 10) {
          setStatus("timeout");
        }
      }
    };

    const statusInterval = setInterval(checkStatus, 2000);
    
    // Check ngay lập tức
    checkStatus();

    return () => {
      clearInterval(dotsInterval);
      clearInterval(statusInterval);
    };
  }, [navigate, searchParams, checkCount]);

  const handleCancel = () => {
    navigate("/upgrade");
  };

  const handleRetry = () => {
    navigate("/upgrade");
  };

  const handleSuccess = () => {
    navigate("/courses");
  };

  if (!paymentInfo) {
    return (
      <div className="payment-waiting">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-waiting">
      <div className="waiting-container">
        
        {/* Waiting State */}
        {status === "waiting" && (
          <>
            <div className="waiting-animation">
              <div className="payment-icon">
                <div className="card-icon">💳</div>
                <div className="pulse-ring"></div>
              </div>
            </div>

            <div className="waiting-content">
              <h1 className="waiting-title">Đang chờ thanh toán{dots}</h1>
              <p className="waiting-description">
                Vui lòng hoàn tất thanh toán <strong>{paymentInfo.plan}</strong> trên ZaloPay
              </p>
              
              <div className="payment-details">
                <div className="detail-row">
                  <span>Gói đã chọn:</span>
                  <span className="highlight">{paymentInfo.plan}</span>
                </div>
                <div className="detail-row">
                  <span>Mã giao dịch:</span>
                  <span className="transaction-code">{paymentInfo.appTransId}</span>
                </div>
              </div>

              <div className="waiting-instructions">
                <p className="instruction-text">
                  💡 <strong>Hướng dẫn:</strong> Vui lòng hoàn tất thanh toán trên tab ZaloPay đã mở. 
                  Hệ thống sẽ tự động cập nhật khi thanh toán thành công.
                </p>
              </div>

              <div className="waiting-actions">
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Hủy thanh toán
                </button>
                <div className="auto-check-info">
                  <span>🔄 Tự động kiểm tra mỗi 2 giây</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Success State */}
        {status === "success" && (
          <>
            <div className="success-animation">
              <div className="checkmark-container">
                <svg className="checkmark" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="25" fill="none"/>
                  <path fill="none" d="m14.1,27.2l7.1,7.2 16.7-16.8"/>
                </svg>
              </div>
            </div>

            <div className="success-content">
              <h1 className="success-title">Thanh toán thành công!</h1>
              <p className="success-description">
                🎉 Chúc mừng! Tài khoản của bạn đã được nâng cấp
              </p>
              
              <div className="success-actions">
                <button className="btn btn-primary" onClick={handleSuccess}>
                  🚀 Bắt đầu làm bài
                </button>
              </div>

              <div className="auto-redirect">
                <p>Đang chuyển đến trang khóa học...</p>
              </div>
            </div>
          </>
        )}

        {/* Failed State */}
        {status === "failed" && (
          <>
            <div className="failed-animation">
              <div className="failed-icon">❌</div>
            </div>

            <div className="failed-content">
              <h1 className="failed-title">Thanh toán thất bại</h1>
              <p className="failed-description">
                Giao dịch không thành công. Vui lòng thử lại.
              </p>
              
              <div className="failed-actions">
                <button className="btn btn-primary" onClick={handleRetry}>
                  Thử lại
                </button>
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Hủy
                </button>
              </div>
            </div>
          </>
        )}

        {/* Timeout State */}
        {status === "timeout" && (
          <>
            <div className="timeout-animation">
              <div className="timeout-icon">⏰</div>
            </div>

            <div className="timeout-content">
              <h1 className="timeout-title">Hết thời gian chờ</h1>
              <p className="timeout-description">
                Không thể kiểm tra trạng thái thanh toán. Vui lòng kiểm tra lại.
              </p>
              
              <div className="timeout-actions">
                <button className="btn btn-primary" onClick={handleRetry}>
                  Kiểm tra lại
                </button>
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Về trang chủ
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}