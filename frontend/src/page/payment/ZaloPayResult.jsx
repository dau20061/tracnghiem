import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./zalopayResult.css";

const PLAN_LABEL = {
  day: "Gói 1 ngày",
  month: "Gói 1 tháng",
  year: "Gói 1 năm",
};

const formatCurrency = (amount) => {
  if (typeof amount !== "number") return amount;
  return amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
};

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch (_e) {
    return value;
  }
};

export default function ZaloPayResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Đang kiểm tra trạng thái thanh toán…");
  const [error, setError] = useState("");
  const [details, setDetails] = useState(null);
  const tokenRef = useRef(localStorage.getItem("token"));
  const timerRef = useRef(null);
  const attemptsRef = useRef(0);
  const [qrCode, setQrCode] = useState("");
  const [orderUrl, setOrderUrl] = useState("");

  const appTransId = useMemo(() => {
    return searchParams.get("appTransId") || localStorage.getItem("zalopayAppTransId") || "";
  }, [searchParams]);

  useEffect(() => {
    const storedQr = localStorage.getItem("zalopayQrCode");
    if (storedQr) setQrCode(storedQr);
    const storedOrderUrl = localStorage.getItem("zalopayOrderUrl");
    if (storedOrderUrl) setOrderUrl(storedOrderUrl);
  }, []);

  useEffect(() => {
    if (!tokenRef.current) {
      setStatus("error");
      setError("Bạn cần đăng nhập lại để xem trạng thái thanh toán.");
      return;
    }
    if (!appTransId) {
      setStatus("error");
      setError("Không tìm thấy mã giao dịch. Vui lòng thử nâng cấp lại.");
      return;
    }

    attemptsRef.current = 0;

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const refreshUser = async () => {
      try {
        const token = tokenRef.current;
        if (!token) return;
        const res = await fetch("http://localhost:4000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          window.dispatchEvent(new Event("auth-changed"));
        }
      } catch (err) {
        console.warn("Không thể làm mới thông tin user", err);
      }
    };

    const pollStatus = async () => {
      try {
        attemptsRef.current += 1;
        const res = await fetch(`http://localhost:4000/api/payments/zalopay/status/${encodeURIComponent(appTransId)}` , {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("zalopayAppTransId");
          localStorage.removeItem("zalopayQrCode");
          localStorage.removeItem("zalopayOrderUrl");
          setQrCode("");
          setOrderUrl("");
          window.dispatchEvent(new Event("auth-changed"));
          setStatus("error");
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          stopPolling();
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Không kiểm tra được trạng thái");
        }
        setDetails(data);
        if (data.status === "paid") {
          setStatus("success");
          setMessage("Thanh toán thành công! Quyền truy cập đã được kích hoạt.");
          localStorage.removeItem("zalopayAppTransId");
          localStorage.removeItem("zalopayQrCode");
          localStorage.removeItem("zalopayOrderUrl");
          setQrCode("");
          setOrderUrl("");
          stopPolling();
          refreshUser();
        } else if (data.status === "failed") {
          setStatus("failed");
          setMessage(data.message || "Thanh toán thất bại.");
          localStorage.removeItem("zalopayAppTransId");
          localStorage.removeItem("zalopayQrCode");
          localStorage.removeItem("zalopayOrderUrl");
          setQrCode("");
          setOrderUrl("");
          stopPolling();
        } else {
          setStatus("pending");
          setMessage("Đang chờ thanh toán. Vui lòng quét mã QR hoặc mở liên kết ZaloPay để thanh toán...");
          if (attemptsRef.current >= 15) {
            setMessage("Thanh toán đang được ZaloPay xử lý lâu hơn dự kiến. Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.");
            stopPolling();
          }
        }
      } catch (e) {
        console.error(e);
        setStatus("error");
        setError(e.message);
        stopPolling();
      }
    };

    pollStatus();
    timerRef.current = setInterval(pollStatus, 4000);

    return stopPolling;
  }, [appTransId]);

  const goHome = () => navigate("/");
  const retry = () => navigate("/upgrade");
  const goCourses = () => navigate("/courses");
  const openOrder = () => {
    if (!orderUrl) return;
    window.open(orderUrl, "_blank", "noopener");
  };

  const simulatePayment = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/payments/zalopay/simulate/${encodeURIComponent(appTransId)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Lỗi mô phỏng");
      // Force immediate status check
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {
      console.error(e);
      setError(`Lỗi mô phỏng: ${e.message}`);
    }
  };

  const qrImageSrc = useMemo(() => {
    if (!qrCode) return "";
    if (qrCode.startsWith("data:image")) return qrCode;
    return `data:image/png;base64,${qrCode}`;
  }, [qrCode]);

  return (
    <div className="zp-result">
      <div className="zp-card">
        <div className={`zp-status ${status}`}>
          {status === "success" && "🎉"}
          {status === "pending" && "⏳"}
          {status === "failed" && "❌"}
          {status === "error" && "⚠️"}
          {status === "checking" && "🔄"}
        </div>
        <h1 className="zp-title">Kết quả thanh toán ZaloPay</h1>
        {message && <p className="zp-message">{message}</p>}
        {error && <p className="zp-error">{error}</p>}

        {qrImageSrc && status !== "success" && (
          <div className="zp-qr">
            <img src={qrImageSrc} alt="QR thanh toán ZaloPay" className="zp-qr-img" />
            <p>
              Mở ứng dụng ZaloPay hoặc ứng dụng ngân hàng hỗ trợ quét QR, chọn "Quét mã" và đưa camera vào màn hình để hoàn tất thanh toán.
            </p>
            {orderUrl && (
              <button type="button" className="btn" onClick={openOrder}>
                Mở liên kết ZaloPay
              </button>
            )}
            <div style={{ marginTop: "12px", padding: "8px", background: "#fef3cd", borderRadius: "8px", fontSize: "14px" }}>
              <strong>🧪 Test mode:</strong> 
              <button 
                type="button" 
                className="btn" 
                style={{ marginLeft: "8px", fontSize: "12px", padding: "4px 8px" }}
                onClick={() => simulatePayment()}
              >
                Mô phỏng thanh toán (tiền được trừ)
              </button>
            </div>
          </div>
        )}

        {!qrImageSrc && status !== "success" && !error && (
          <p className="zp-note">
            Không tìm thấy mã QR. Vui lòng kiểm tra thông báo từ ZaloPay trên điện thoại hoặc tạo lại giao dịch.
          </p>
        )}

        {details && (
          <div className="zp-details">
            <div><span>Mã giao dịch:</span> <strong>{appTransId}</strong></div>
            {details.plan && (
              <div><span>Gói:</span> <strong>{PLAN_LABEL[details.plan] || details.plan}</strong></div>
            )}
            {typeof details.amount === "number" && (
              <div><span>Số tiền:</span> <strong>{formatCurrency(details.amount)}</strong></div>
            )}
            {details.updatedAt && (
              <div><span>Cập nhật lúc:</span> <strong>{formatDateTime(details.updatedAt)}</strong></div>
            )}
            {details.message && (
              <div><span>Ghi chú:</span> <strong>{details.message}</strong></div>
            )}
          </div>
        )}

        <div className="zp-actions">
          {status === "success" ? (
            <>
              <button className="btn btn-primary" type="button" onClick={goCourses}>Vào khoá học</button>
              <button className="btn" type="button" onClick={goHome}>Trang chủ</button>
            </>
          ) : status === "pending" || status === "checking" ? (
            <>
              <button className="btn" type="button" onClick={goHome}>Trang chủ</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" type="button" onClick={retry}>Thử thanh toán lại</button>
              <button className="btn" type="button" onClick={goHome}>Trang chủ</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
