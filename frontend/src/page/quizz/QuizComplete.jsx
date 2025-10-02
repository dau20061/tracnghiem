// src/page/quiz/QuizComplete.jsx
import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./quiz.css";

export default function QuizComplete() {
  const { quizId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();

  // Ưu tiên lấy từ state khi điều hướng, fallback sessionStorage nếu refresh
  const fromState = loc.state;
  const fromStore = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("quizResult");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const total = fromState?.total ?? fromStore?.total ?? 0;
  const done  = fromState?.done  ?? fromStore?.done  ?? 0;

  return (
    <div className="quiz-wrap">
      <div className="card" style={{ textAlign: "center", padding: 28 }}>
        <h1 style={{ marginTop: 0 }}>🎉 Hoàn thành bài kiểm tra</h1>
        <p style={{ color: "var(--muted)" }}>Mã bài: <strong>{quizId}</strong></p>

        <div style={{ fontSize: 18, marginTop: 10 }}>
          Bạn đã hoàn thành <strong>{done}</strong>/<strong>{total}</strong> câu.
        </div>

        <div className="actions" style={{ justifyContent: "center", marginTop: 16 }}>
          <button className="btn" onClick={() => nav(`/quiz/${quizId}`)}>
            Làm lại bài
          </button>
          <button className="btn btn-primary" onClick={() => nav("/practice")} style={{ minWidth: 160 }}>
            ← Về IC3Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
