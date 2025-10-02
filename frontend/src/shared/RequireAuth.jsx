// shared/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    // Nếu chưa login → quay lại /login?quiz=... (nếu đang ở /quiz/..)
    const parts = location.pathname.split("/");
    const qid = parts[1] === "quiz" ? parts[2] : "";
    const search = qid ? `?quiz=${encodeURIComponent(qid)}` : "";
    return <Navigate to={`/login${search}`} replace />;
  }
  return children;
}
