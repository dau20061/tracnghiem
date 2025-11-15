import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./SupportChat.css";

const formatTime = (value) => {
  try {
    return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch (_e) {
    return value;
  }
};

const MessageBubble = ({ msg }) => (
  <div className={`chat-row ${msg.sender}`}>
    <div className="chat-bubble">
      <div className="chat-text">{msg.message}</div>
      <div className="chat-time">{formatTime(msg.createdAt)}</div>
    </div>
  </div>
);

export default function SupportChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!open) return;
    if (!token) return;
    let cancelled = false;
    let timer;

    const fetchMessages = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/chat/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (!cancelled) {
            setMessages([]);
            setError("Vui lòng đăng nhập để chat với admin");
          }
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Không tải được tin nhắn");
        if (!cancelled) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchMessages, 5000);
        }
      }
    };

    setLoading(true);
    fetchMessages().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  if (isAdminRoute) return null;

  const toggle = () => {
    setOpen((v) => !v);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!token) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/api/chat/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Không gửi được tin nhắn");
      setMessages((prev) => [...prev, data.message]);
      setInput("");
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="support-chat">
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div>
              <div className="chat-title">Hỗ trợ khách hàng</div>
              <div className="chat-sub">Chat trực tiếp với admin</div>
            </div>
            <button type="button" className="chat-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          {!token ? (
            <div className="chat-auth">
              <p>Vui lòng đăng nhập để trao đổi với admin.</p>
              <button type="button" onClick={() => navigate("/login", { state: { from: location.pathname } })}>
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <>
              <div className="chat-body" ref={listRef}>
                {loading && <div className="chat-status">Đang tải…</div>}
                {!loading && messages.length === 0 && <div className="chat-status">Hãy gửi tin nhắn đầu tiên tới admin.</div>}
                {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
              </div>
              {error && <div className="chat-error">{error}</div>}
              <div className="chat-input">
                <textarea
                  placeholder="Nhập tin nhắn"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={2}
                />
                <button type="button" onClick={sendMessage} disabled={sending || !input.trim()}>
                  Gửi
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button type="button" className="chat-toggle" onClick={toggle}>
        💬
      </button>
    </div>
  );
}
