import React, { useEffect, useState } from "react";import { API_URL } from '../../config/api';

import { useNavigate } from "react-router-dom";
import "./paymentCheck.css";

export default function PaymentCheck() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Đang kiểm tra kết quả thanh toán...");
  const [appTransId, setAppTransId] = useState("");

  useEffect(() => {
    const storedAppTransId = localStorage.getItem("zalopayAppTransId");
    if (!storedAppTransId) {
      setStatus("error");
      setMessage("Không tìm thấy thông tin giao dịch. Vui lòng thử thanh toán lại.");
      return;
    }

    setAppTransId(storedAppTransId);
    
    const checkPaymentStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setStatus("error");
          setMessage("Vui lòng đăng nhập để kiểm tra thanh toán.");
          return;
        }

        const res = await fetch(`${API_URL}/api/payments/zalopay/status/${encodeURIComponent(storedAppTransId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("auth-changed"));
          setStatus("error");
          setMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Không kiểm tra được trạng thái thanh toán");
        }

        if (data.status === "paid") {
          setStatus("success");
          setMessage("Thanh toán thành công! Quyền truy cập đã được kích hoạt.");
          localStorage.removeItem("zalopayAppTransId");
          
          // Refresh user data
          const userRes = await fetch(`${API_URL}/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData?.user) {
              localStorage.setItem("user", JSON.stringify(userData.user));
              window.dispatchEvent(new Event("auth-changed"));
            }
          }
          
          // Get plan from appTransId to include in redirect
          const plan = localStorage.getItem("zalopayPlan") || "unknown";
          localStorage.removeItem("zalopayPlan");
          
          // Redirect directly to success page
          navigate(`/payment/success?appTransId=${encodeURIComponent(storedAppTransId)}&status=paid&plan=${encodeURIComponent(plan)}`);
        } else if (data.status === "failed") {
          setStatus("failed");
          setMessage("Thanh toán thất bại. Vui lòng thử lại.");
          localStorage.removeItem("zalopayAppTransId");
        } else {
          setStatus("pending");
          setMessage("Thanh toán chưa hoàn tất. Bạn có thể đóng trang này và quay lại sau.");
        }
      } catch (error) {
        console.error("Payment check error:", error);
        setStatus("error");
        setMessage(`Lỗi kiểm tra thanh toán: ${error.message}`);
      }
    };

    // Check immediately and then every 3 seconds
    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, 3000);

    return () => clearInterval(interval);
  }, [navigate]);

  const goHome = () => navigate("/");
  const retry = () => navigate("/upgrade");
  const goCourses = () => navigate("/courses");

  return (
    <div className="payment-check">
      <div className="payment-card">
        <div className={`payment-status ${status}`}>
          {status === "success" && "🎉"}
          {status === "pending" && "⏳"}
          {status === "failed" && "❌"}
          {status === "error" && "⚠️"}
          {status === "checking" && "🔄"}
        </div>
        <h1>Kết quả thanh toán</h1>
        <p className="payment-message">{message}</p>
        
        {appTransId && (
          <div className="payment-info">
            <p><strong>Mã giao dịch:</strong> {appTransId}</p>
          </div>
        )}

        <div className="payment-actions">
          {status === "success" ? (
            <>
              <button className="btn btn-primary" onClick={goCourses}>Vào khóa học</button>
              <button className="btn" onClick={goHome}>Trang chủ</button>
            </>
          ) : status === "pending" ? (
            <>
              <button className="btn" onClick={goHome}>Trang chủ</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={retry}>Thử thanh toán lại</button>
              <button className="btn" onClick={goHome}>Trang chủ</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}