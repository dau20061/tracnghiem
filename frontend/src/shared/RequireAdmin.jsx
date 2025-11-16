import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAdmin({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  let user = null;

  if (token) {
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch (err) {
      console.warn("Cannot parse user session", err);
    }
  }

  if (!token || !user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
