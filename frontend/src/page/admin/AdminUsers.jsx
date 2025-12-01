import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from '../../config/api';

import { useNavigate } from "react-router-dom";
import "./adminUsers.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch (_e) {
    return value;
  }
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", attempts: 0 });
  const [filterStatus, setFilterStatus] = useState("all"); // all, verified, pending
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users/admin`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Không tải được danh sách user");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setErr(e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setNotice("");
    setErr("");
    fetchUsers();
  }, [fetchUsers]);

  const adminRequest = async (url, options = {}, successMsg = "Đã cập nhật") => {
    setLoading(true);
    setErr("");
    setNotice("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Thao tác thất bại");
      await fetchUsers();
      setNotice(successMsg);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password || !createForm.email) {
      setErr("Vui lòng nhập username, email và password");
      return;
    }
    if (createForm.password.length < 6) {
      setErr("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    if (!EMAIL_REGEX.test(createForm.email.trim())) {
      setErr("Email không hợp lệ");
      return;
    }
    await adminRequest(
      `${API_URL}/api/users/admin`,
      {
        method: "POST",
        body: JSON.stringify({
          username: createForm.username,
          email: createForm.email.trim(),
          password: createForm.password,
          attempts: Number(createForm.attempts) || 0,
        }),
      },
      "Đã tạo tài khoản"
    );
    setCreateForm({ username: "", email: "", password: "", attempts: 0 });
  };

  const extendPlan = (id, plan) => adminRequest(
    `${API_URL}/api/users/admin/${id}/membership`,
    {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    },
    plan === "free" ? "Đã chuyển về gói miễn phí" : "Đã gia hạn gói"
  );

  const addAttempts = (id) => {
    const attempts = window.prompt("Cộng thêm bao nhiêu lượt làm bài?", "10");
    if (!attempts) return;
    const num = Number(attempts);
    if (Number.isNaN(num) || num <= 0) {
      setErr("Số lượt không hợp lệ");
      return;
    }
    adminRequest(
      `${API_URL}/api/users/admin/${id}/attempts`,
      {
        method: "PATCH",
        body: JSON.stringify({ attempts: num }),
      },
      `Đã cộng thêm ${num} lượt làm bài`
    );
  };

  const changePassword = (id, username) => {
    const pwd = window.prompt(`Nhập mật khẩu mới cho ${username}`, "");
    if (!pwd) return;
    if (pwd.length < 6) {
      setErr("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    adminRequest(
      `${API_URL}/api/users/admin/${id}/password`,
      {
        method: "PATCH",
        body: JSON.stringify({ password: pwd }),
      },
      "Đã đổi mật khẩu"
    );
  };

  const toggleDisabled = (user) => adminRequest(
    `${API_URL}/api/users/admin/${user.id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ disabled: !user.isDisabled }),
    },
    user.isDisabled ? "Đã mở khóa tài khoản" : "Đã vô hiệu hóa tài khoản"
  );

  const removeUser = (id, username) => {
    if (!window.confirm(`Xóa tài khoản ${username}?`)) return;
    adminRequest(
      `${API_URL}/api/users/admin/${id}`,
      { method: "DELETE" },
      "Đã xóa tài khoản"
    );
  };

  return (
    <div className="admin-users-wrap">
      <header className="admin-users-head">
        <div>
          <h1>Quản lý tài khoản khách hàng</h1>
          <p>Theo dõi gói đã đăng ký, gia hạn, đổi mật khẩu hoặc vô hiệu hóa tài khoản.</p>
        </div>
        <div className="admin-users-actions">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ marginRight: '10px', padding: '8px' }}
          >
            <option value="all">Tất cả tài khoản</option>
            <option value="verified">Chỉ đã xác thực</option>
            <option value="pending">Chỉ chưa xác thực</option>
          </select>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setNotice("");
              setErr("");
              fetchUsers();
            }}
            disabled={loading}
          >
            Tải lại
          </button>
        </div>
      </header>

      <section className="admin-create-panel">
        <h2>Tạo tài khoản mới</h2>
        <form className="create-form" onSubmit={createUser}>
          <input
            placeholder="username"
            value={createForm.username}
            onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
          <input
            placeholder="gmail"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            placeholder="password (>=6 ký tự)"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <input
            placeholder="Số lượt làm bài (mặc định: 0)"
            type="number"
            min="0"
            value={createForm.attempts}
            onChange={(e) => setCreateForm((f) => ({ ...f, attempts: e.target.value }))}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>Tạo</button>
        </form>
      </section>

      {loading && <div className="notice info">Đang xử lý…</div>}
      {err && <div className="notice error">{err}</div>}
      {notice && <div className="notice success">{notice}</div>}

      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '15px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div>
          <strong>Tổng tài khoản:</strong> {users.length}
        </div>
        <div style={{ color: 'green' }}>
          <strong>Đã xác thực:</strong> {users.filter(u => u.isVerified).length}
        </div>
        <div style={{ color: 'orange' }}>
          <strong>Chờ xác thực:</strong> {users.filter(u => !u.isVerified).length}
        </div>
      </div>

      <section className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Lượt còn lại</th>
              <th>Tổng đã mua</th>
              <th>Tạo lúc</th>
              <th>Xác thực</th>
              <th>Trạng thái hoạt động</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">Chưa có dữ liệu. Nhập khóa và bấm tải lại.</td>
              </tr>
            )}
            {users
              .filter((user) => {
                if (filterStatus === "verified") return user.isVerified;
                if (filterStatus === "pending") return !user.isVerified;
                return true; // all
              })
              .map((user) => (
              <tr key={user.id} className={user.isDisabled ? "disabled" : ""}>
                <td>
                  <div className="user-cell">
                    <div className="avatar">{user.username?.slice(0,1)?.toUpperCase()}</div>
                    <div>
                      <div className="username">{user.username}</div>
                      {user.email && <div className="meta">{user.email}</div>}
                      <div className="meta">id:{user.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <strong style={{ color: user.remainingAttempts > 0 ? '#10b981' : '#ef4444', fontSize: '16px' }}>
                    {user.remainingAttempts || 0}
                  </strong>
                </td>
                <td>
                  <span style={{ color: '#6b7280' }}>{user.totalPurchasedAttempts || 0}</span>
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>
                  {user.isVerified ? (
                    <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Đã xác thực</span>
                  ) : (
                    <span style={{ color: 'orange', fontWeight: 'bold' }}>⚠ Chưa xác thực</span>
                  )}
                </td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    backgroundColor: user.accountStatus === 'active' ? '#e6ffe6' : user.accountStatus === 'pending' ? '#fff4e6' : '#ffe6e6',
                    color: user.accountStatus === 'active' ? '#008000' : user.accountStatus === 'pending' ? '#ff8c00' : '#ff0000'
                  }}>
                    {user.accountStatus === 'pending' ? '🕐 Đang xác thực' : user.accountStatus === 'active' ? '✓ Đang hoạt động' : '✕ Vô hiệu hóa'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button type="button" onClick={() => navigate(`/admin/users/${user.id}/quiz-history`)}>📊 Lịch sử bài làm</button>
                    <button type="button" onClick={() => extendPlan(user.id, "day")}>+3 lượt</button>
                    <button type="button" onClick={() => extendPlan(user.id, "month")}>+20 lượt</button>
                    <button type="button" onClick={() => extendPlan(user.id, "year")}>+200 lượt</button>
                    <button type="button" onClick={() => addAttempts(user.id)}>+N lượt</button>
                    <button type="button" onClick={() => changePassword(user.id, user.username)}>Đổi mật khẩu</button>
                    <button type="button" onClick={() => toggleDisabled(user)}>{user.isDisabled ? "Mở khóa" : "Vô hiệu"}</button>
                    <button type="button" className="danger" onClick={() => removeUser(user.id, user.username)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
