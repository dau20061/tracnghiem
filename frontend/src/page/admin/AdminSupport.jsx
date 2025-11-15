import React, { useCallback, useEffect, useState } from "react";
import "./adminSupport.css";

import { formatDateTime } from "./adminSupportUtils";

const formatDuration = (ms) => {
  const totalMs = Number(ms) || 0;
  if (totalMs <= 0) return "Chưa mua";
  const totalMinutes = Math.floor(totalMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} ngày`);
  if (hours) parts.push(`${hours} giờ`);
  if (!days && minutes) parts.push(`${minutes} phút`);
  return parts.join(" ") || "0 phút";
};

const MessageRow = ({ msg }) => (
  <div className={`support-row ${msg.sender}`}>
    <div className="support-bubble">
      <div className="support-text">{msg.message}</div>
      <div className="support-time">{formatDateTime(msg.createdAt)}</div>
    </div>
  </div>
);

export default function AdminSupport() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const selectedId = selected?.id;

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await fetch("http://localhost:4000/api/chat/admin/threads");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Không tải được danh sách hội thoại");
      setThreads(Array.isArray(data.threads) ? data.threads : []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`http://localhost:4000/api/chat/admin/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Không tải được hội thoại");
      setSelected(data.user);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    const timer = setInterval(() => {
      loadThreads();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    const timer = setInterval(() => {
      loadMessages(selectedId);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedId, loadMessages]);

  const onSelectThread = (thread) => {
    setSelected({
      id: thread.userId,
      username: thread.username,
      email: thread.email,
      membershipLevel: thread.membershipLevel,
      totalPurchasedMs: thread.totalPurchasedMs,
    });
    setMessages([]);
    loadMessages(thread.userId);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !selectedId) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:4000/api/chat/admin/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Không gửi được tin nhắn");
      setMessages((prev) => [...prev, data.message]);
      setInput("");
      loadThreads();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-support">
      <div className="support-sidebar">
        <div className="support-sidebar-head">
          <h1>Chăm sóc khách hàng</h1>
          <button type="button" className="btn" onClick={loadThreads} disabled={loadingThreads}>
            {loadingThreads ? "Đang tải…" : "Tải lại"}
          </button>
        </div>
        {error && !selectedId && <div className="support-error">{error}</div>}
        <div className="support-thread-list">
          {threads.length === 0 && !loadingThreads ? (
            <div className="support-empty">Chưa có hội thoại nào.</div>
          ) : (
            threads.map((thread) => (
              <button
                type="button"
                key={thread.userId}
                className={`support-thread ${selectedId === thread.userId ? "active" : ""}`}
                onClick={() => onSelectThread(thread)}
              >
                <div className="support-thread-top">
                  <span className="support-name">{thread.username}</span>
                  {thread.unreadCount > 0 && <span className="support-unread">{thread.unreadCount}</span>}
                </div>
                {thread.email && <div className="support-thread-meta">{thread.email}</div>}
                <div className="support-thread-meta">
                  <span>{thread.lastSender === "user" ? "Khách" : "Admin"}:</span>
                  <span className="support-last">{thread.lastMessage}</span>
                </div>
                <div className="support-thread-time">{formatDateTime(thread.lastAt)}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="support-chat-pane">
        {!selected && <div className="support-placeholder">Chọn một khách hàng để bắt đầu chat.</div>}
        {selected && (
          <div className="support-chat-card">
            <header className="support-chat-head">
              <div>
                <div className="support-chat-name">{selected.username}</div>
                {selected.email && <div className="support-chat-plan">{selected.email}</div>}
                <div className="support-chat-plan">Tổng thời gian đã mua: {formatDuration(selected.totalPurchasedMs)}</div>
              </div>
            </header>
            <main className="support-chat-body">
              {loadingMessages && <div className="support-status">Đang tải…</div>}
              {!loadingMessages && messages.length === 0 && <div className="support-status">Chưa có tin nhắn.</div>}
              {messages.map((msg) => <MessageRow key={msg.id} msg={msg} />)}
            </main>
            {error && selectedId && <div className="support-error">{error}</div>}
            <footer className="support-chat-input">
              <textarea
                placeholder="Nhập phản hồi"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
              />
              <button type="button" onClick={sendMessage} disabled={sending || !input.trim()}>
                Gửi
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
