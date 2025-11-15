import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./UserBadge.css";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Không đọc được user từ localStorage", e);
    return null;
  }
};

const formatPurchasedDuration = (msInput) => {
  const ms = Number(msInput) || 0;
  if (ms <= 0) return "0 phút";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} ngày`);
  if (hours) parts.push(`${hours} giờ`);
  if (!days && minutes) {
    parts.push(`${minutes} phút`);
  } else if (days && minutes && parts.length < 2) {
    parts.push(`${minutes} phút`);
  }
  return parts.length ? parts.join(" ") : "0 phút";
};

export default function UserBadge() {
  const [user, setUser] = useState(() => getStoredUser());
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("storage", sync);
    window.addEventListener("auth-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-changed", sync);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (!cancelled) {
            setUser(null);
            window.dispatchEvent(new Event("auth-changed"));
          }
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          setUser(data.user);
        }
      } catch (e) {
        console.warn("Không lấy được thông tin user", e);
      }
    };
    refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("click", onClick);
    }
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  const isAdminRoute = location.pathname.startsWith("/admin");

  if (!user || isAdminRoute) return null;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-changed"));
    setOpen(false);
    navigate("/login");
  };

  const gotoUpgrade = () => {
    setOpen(false);
    navigate("/upgrade");
  };

  const gotoHistory = () => {
    setOpen(false);
    navigate("/quiz-history");
  };

  return (
    <div className="user-badge" ref={menuRef}>
      <button className="user-pill" onClick={() => setOpen((v) => !v)}>
        <span className="avatar">{(user.username || "?").slice(0, 1).toUpperCase()}</span>
        <span className="name">{user.username}</span>
        <span className="chevron">▾</span>
      </button>
      {open && (
        <div className="user-menu">
          <div className="user-meta">
            <div className="meta-name">{user.username}</div>
            {user.email && <div className="meta-plan">{user.email}</div>}
            <div className="meta-duration">
              Tổng thời gian đã mua: {formatPurchasedDuration(user.totalPurchasedMs)}
            </div>
            {user.isDisabled && <div className="meta-disabled">Tài khoản đang bị vô hiệu hóa</div>}
          </div>
          <button className="menu-item" onClick={gotoHistory}>📊 Lịch sử làm bài</button>
          <button className="menu-item" onClick={gotoUpgrade}>Nâng cấp quyền</button>
          <button className="menu-item" onClick={logout}>Đăng xuất</button>
        </div>
      )}
    </div>
  );
}
