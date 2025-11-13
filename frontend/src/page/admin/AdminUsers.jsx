import React, { useCallback, useEffect, useState } from "react";
import "./adminUsers.css";

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
  const [createForm, setCreateForm] = useState({ username: "", password: "", plan: "free" });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("http://localhost:4000/api/users/admin");
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
      const res = await fetch(url, {
        ...options,
        headers: {
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
    if (!createForm.username || !createForm.password) {
      setErr("Vui lòng nhập username và password");
      return;
    }
    if (createForm.password.length < 6) {
      setErr("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    await adminRequest(
      "http://localhost:4000/api/users/admin",
      {
        method: "POST",
        body: JSON.stringify({
          username: createForm.username,
          password: createForm.password,
          plan: createForm.plan,
        }),
      },
      "Đã tạo tài khoản"
    );
    setCreateForm({ username: "", password: "", plan: "free" });
  };

  const extendPlan = (id, plan) => adminRequest(
    `http://localhost:4000/api/users/admin/${id}/membership`,
    {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    },
    plan === "free" ? "Đã chuyển về gói miễn phí" : "Đã gia hạn gói"
  );

  const extendCustomDays = (id) => {
    const days = window.prompt("Tăng thêm bao nhiêu ngày?", "7");
    if (!days) return;
    const num = Number(days);
    if (Number.isNaN(num) || num <= 0) {
      setErr("Số ngày không hợp lệ");
      return;
    }
    adminRequest(
      `http://localhost:4000/api/users/admin/${id}/membership`,
      {
        method: "PATCH",
        body: JSON.stringify({ extendDays: num }),
      },
      `Đã cộng thêm ${num} ngày`
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
      `http://localhost:4000/api/users/admin/${id}/password`,
      {
        method: "PATCH",
        body: JSON.stringify({ password: pwd }),
      },
      "Đã đổi mật khẩu"
    );
  };

  const toggleDisabled = (user) => adminRequest(
    `http://localhost:4000/api/users/admin/${user.id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ disabled: !user.isDisabled }),
    },
    user.isDisabled ? "Đã mở khóa tài khoản" : "Đã vô hiệu hóa tài khoản"
  );

  const removeUser = (id, username) => {
    if (!window.confirm(`Xóa tài khoản ${username}?`)) return;
    adminRequest(
      `http://localhost:4000/api/users/admin/${id}`,
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
            placeholder="password (>=6 ký tự)"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
          <select
            value={createForm.plan}
            onChange={(e) => setCreateForm((f) => ({ ...f, plan: e.target.value }))}
          >
            <option value="free">Gói miễn phí</option>
            <option value="day">Gói 1 ngày</option>
            <option value="month">Gói 1 tháng</option>
            <option value="year">Gói 1 năm</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={loading}>Tạo</button>
        </form>
      </section>

      {loading && <div className="notice info">Đang xử lý…</div>}
      {err && <div className="notice error">{err}</div>}
      {notice && <div className="notice success">{notice}</div>}

      <section className="users-table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Tài khoản</th>
              <th>Hết hạn</th>
              <th>Tạo lúc</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">Chưa có dữ liệu. Nhập khóa và bấm tải lại.</td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className={user.isDisabled ? "disabled" : ""}>
                <td>
                  <div className="user-cell">
                    <div className="avatar">{user.username?.slice(0,1)?.toUpperCase()}</div>
                    <div>
                      <div className="username">{user.username}</div>
                      <div className="meta">id:{user.id}</div>
                    </div>
                  </div>
                </td>
                <td>{formatDate(user.membershipExpiresAt)}</td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{user.isDisabled ? "Đã vô hiệu hóa" : "Đang hoạt động"}</td>
                <td>
                  <div className="actions">
                    <button type="button" onClick={() => extendPlan(user.id, "day")}>+1 ngày</button>
                    <button type="button" onClick={() => extendPlan(user.id, "month")}>+1 tháng</button>
                    <button type="button" onClick={() => extendPlan(user.id, "year")}>+1 năm</button>
                    <button type="button" onClick={() => extendPlan(user.id, "free")}>Free</button>
                    <button type="button" onClick={() => extendCustomDays(user.id)}>+N ngày</button>
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
