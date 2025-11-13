import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./adminLayout.css";

const navLinkClass = ({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`;

export default function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <span className="admin-logo">Admin</span>
          <p className="admin-tagline">Quản lý nội dung hệ thống</p>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className={navLinkClass}>
            Tạo & chỉnh sửa quiz
          </NavLink>
          <NavLink to="/admin/users" className={navLinkClass}>
            Quản lý người dùng
          </NavLink>
        </nav>
        <button type="button" className="admin-exit" onClick={() => navigate("/")}>
          ← Về trang chính
        </button>
      </aside>
      <main className="admin-layout-body">
        <Outlet />
      </main>
    </div>
  );
}
