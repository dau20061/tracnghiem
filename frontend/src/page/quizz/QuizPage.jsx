// src/page/quiz/QuizPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { API_URL } from '../../config/api';

import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./quiz.css";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get retry information from location state
  const isRetry = location.state?.isRetry || false;
  const originalAttemptId = location.state?.originalAttemptId || null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [user, setUser] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [locked, setLocked] = useState(true);
  const [lockReason, setLockReason] = useState("Tài khoản của bạn hiện chưa nâng cấp.");

  const [mode, setMode] = useState("training"); // 'training' | 'testing'
  const [idx, setIdx] = useState(0);            // câu hiện tại (index)
  const [answers, setAnswers] = useState({});   // { [qId]: { answered: true, ... } }
  const [skipped, setSkipped] = useState(new Set()); // các câu đã bỏ qua
  const [questionStartTime, setQuestionStartTime] = useState(Date.now()); // Thời gian bắt đầu câu hiện tại
  const [sessionId] = useState(() => `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`); // Unique session ID

  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const completedRef = useRef(false);

  // Security: Prevent screenshot and copy
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts for screenshots and copy
    const handleKeyDown = (e) => {
      // Prevent PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        alert('⚠️ Chụp màn hình bị vô hiệu hóa trong khi làm bài');
        return false;
      }
      
      // Prevent Ctrl/Cmd + P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert('⚠️ In trang bị vô hiệu hóa trong khi làm bài');
        return false;
      }
      
      // Prevent Ctrl/Cmd + S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl/Cmd + C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        alert('⚠️ Sao chép nội dung bị vô hiệu hóa trong khi làm bài');
        return false;
      }
      
      // Prevent Ctrl/Cmd + A (Select All)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl/Cmd + U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Prevent F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Prevent Ctrl+Shift+C (Inspect Element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
    };

    // Disable copy/cut/paste
    const handleCopy = (e) => {
      e.preventDefault();
      alert('⚠️ Sao chép nội dung bị vô hiệu hóa trong khi làm bài');
      return false;
    };

    const handleCut = (e) => {
      e.preventDefault();
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection via mouse
    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Detect screenshot attempt (blur event - when switching apps)
    const handleBlur = () => {
      console.warn('⚠️ User switched away from quiz - possible screenshot attempt');
    };

    // Detect DevTools opening
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        console.warn('⚠️ DevTools detected');
        // Optionally blur content or show warning
        document.body.style.filter = 'blur(5px)';
        setTimeout(() => {
          document.body.style.filter = '';
        }, 2000);
      }
    };

    // Check DevTools periodically
    const devToolsInterval = setInterval(detectDevTools, 1000);

    // Add all event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('blur', handleBlur);

    // Add CSS to prevent text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';

    // Cleanup on unmount
    return () => {
      clearInterval(devToolsInterval);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('blur', handleBlur);
      
      // Restore normal behavior
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.msUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.filter = '';
    };
  }, []);

  const markAnswered = (qid, info = {}) => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000); // tính thời gian bằng giây
    setAnswers((prev) => ({ 
      ...prev, 
      [qid]: { 
        ...(prev[qid] || {}), 
        ...info, 
        answered: true, 
        timeSpent: (prev[qid]?.timeSpent || 0) + timeSpent 
      } 
    }));
    setSkipped((s) => {
      if (!s.has(qid)) return s;
      const n = new Set(s);
      n.delete(qid);
      return n;
    });
  };

  const isMembershipActive = (u) => {
    if (!u) return false;
    // Check if user has remaining attempts
    if (u.remainingAttempts && u.remainingAttempts > 0) return true;
    // Fallback to old time-based check
    if (u.membershipLevel === "free") return false;
    if (!u.membershipExpiresAt) return false;
    return new Date(u.membershipExpiresAt) > new Date();
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        
        // Kiểm tra nếu là retry thì cho phép vào (không cần check lượt)
        if (isRetry) {
          setLocked(false);
          setLockReason("");
        } else if (isMembershipActive(parsed)) {
          setLocked(false);
          setLockReason("");
        } else {
          setLocked(true);
          if (parsed.remainingAttempts === 0) {
            setLockReason("Bạn đã hết lượt làm bài. Vui lòng nâng cấp.");
          } else {
            setLockReason("Tài khoản của bạn hiện chưa nâng cấp.");
          }
        }
      } catch (_) {
        // ignore parse error
      }
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setMembershipLoading(false);
      setLocked(true);
      setLockReason("Bạn cần đăng nhập lại.");
      return;
    }

    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("auth-changed"));
          setMembershipLoading(false);
          navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không lấy được thông tin tài khoản");
        setUser(json.user);
        localStorage.setItem("user", JSON.stringify(json.user));
        
        // Nếu là retry thì không cần check lượt
        if (isRetry) {
          setLocked(false);
          setLockReason("");
        } else if (isMembershipActive(json.user)) {
          setLocked(false);
          setLockReason("");
        } else {
          setLocked(true);
          if (json.user.remainingAttempts === 0) {
            setLockReason("Bạn đã hết lượt làm bài. Vui lòng nâng cấp.");
          } else {
            setLockReason("Tài khoản của bạn hiện chưa nâng cấp.");
          }
        }
      } catch (error) {
        console.error(error);
        setLocked(true);
        setLockReason("Không xác định được trạng thái quyền truy cập.");
      } finally {
        setMembershipLoading(false);
      }
    };

    fetchMe();
  }, [navigate, quizId, location.pathname, location.search, isRetry]);

  // tải đề
  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr("");
      try {
        const res = await fetch(`${API_URL}/api/quizzes/${encodeURIComponent(quizId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không tải được đề");
        setData(json);
        setIdx(0);
        setAnswers({});
        setSkipped(new Set());
        setQuestionStartTime(Date.now()); // Reset thời gian khi tải đề mới
        // Sử dụng timeLimit từ quiz settings (phút -> giây)
        const quizTimeLimit = json.settings?.timeLimit ? json.settings.timeLimit * 60 : null;
        setTimeLeft(mode === "testing" ? quizTimeLimit : null);
        completedRef.current = false;
        
        // Clear previous save flag để có thể lưu lại quiz result mới
        const oldSessionKeys = Object.keys(sessionStorage).filter(key => key.startsWith(`quiz-saved-${quizId}-`));
        oldSessionKeys.forEach(key => sessionStorage.removeItem(key));
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  // khi đổi mode, reset tiến trình đơn giản
  useEffect(() => {
    if (!data) return;
    setIdx(0);
    setAnswers({});
    setSkipped(new Set());
    setQuestionStartTime(Date.now()); // Reset thời gian
    if (timerRef.current) clearInterval(timerRef.current);
    // Sử dụng timeLimit từ quiz settings (phút -> giây)
    const quizTimeLimit = data.settings?.timeLimit ? data.settings.timeLimit * 60 : null;
    setTimeLeft(mode === "testing" ? quizTimeLimit : null);
    completedRef.current = false;
  }, [mode, data]);

  // đồng hồ testing
  useEffect(() => {
    if (mode !== "testing" || timeLeft == null) return;
    if (timeLeft <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        complete(true);
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t == null ? null : t - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [mode, timeLeft]);

  // cuộn lên đầu khi đổi câu
  useEffect(() => {
    if (!loading) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [idx, loading]);

  if (membershipLoading) return <div className="quiz-wrap">Đang kiểm tra quyền truy cập…</div>;
  if (locked) {
    const expiresAt = user?.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null;
    return (
      <div className="quiz-lock-screen">
        <div className="lock-card">
          <div className="lock-icon">🔒</div>
          <h1>Chưa thể làm bài</h1>
          <p className="lock-desc">{lockReason || "Bạn cần nâng cấp quyền để tiếp tục."}</p>
          {expiresAt && (
            <p className="lock-expire">Gói hiện tại hết hạn vào {expiresAt.toLocaleString("vi-VN")}</p>
          )}
          <div className="lock-actions">
            <button className="btn btn-primary" onClick={() => navigate("/upgrade")}>
              Nâng cấp ngay
            </button>
            <button className="btn btn-light" onClick={() => navigate("/")}>Về trang chủ</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="quiz-wrap">Đang tải đề…</div>;
  if (err)      return <div className="quiz-wrap" style={{color:"#dc2626"}}>Lỗi: {err}</div>;
  if (!data)    return <div className="quiz-wrap">Không có dữ liệu</div>;

  const total = data.questions.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  const prev = () => {
    setIdx((i) => {
      const newIdx = Math.max(0, i - 1);
      setQuestionStartTime(Date.now()); // Reset thời gian khi chuyển câu
      return newIdx;
    });
  };
  
  const next = () => {
    const q = data.questions[idx];
    const answered = !!answers[q.id]?.answered;
    if (!answered) {
      // đánh dấu câu hiện tại là skipped
      setSkipped((s) => new Set([...s, q.id]));
    }
    setIdx((i) => {
      const newIdx = Math.min(total - 1, i + 1);
      setQuestionStartTime(Date.now()); // Reset thời gian khi chuyển câu
      return newIdx;
    });
  };

  // Helper function để kiểm tra câu trả lời đúng/sai
  const checkAnswer = (question, userAnswer) => {
    if (!userAnswer || !userAnswer.answered) return false;
    
    switch (question.type) {
      case 'single':
      case 'image_single':
      case 'image_grid':
        // SingleChoice và ImageGridChoice gửi { choice: string, correct: boolean }
        return userAnswer.choice === question.correct;
      
      case 'multi':
        // MultiChoice gửi { choices: Array, correct: boolean }
        if (!Array.isArray(question.correct) || !userAnswer.choices || !Array.isArray(userAnswer.choices)) {
          return false;
        }
        const correctSet = new Set(question.correct);
        const userSet = new Set(userAnswer.choices);
        return correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x));
      
      case 'binary':
        // BinaryTwoCols gửi { distribution: { left, right }, correct: boolean }
        if (!userAnswer.distribution) return false;
        return question.items.every(item => {
          const isInLeft = userAnswer.distribution.left.includes(item.id);
          const isInRight = userAnswer.distribution.right.includes(item.id);
          const correctColumn = item.correctColumn;
          
          if (correctColumn === question.columns[0]) { // Cột đầu tiên (left)
            return isInLeft;
          } else { // Cột thứ hai (right)
            return isInRight;
          }
        });
      
      case 'dragdrop':
        // DragDropTargets gửi { mapping: object, correct: boolean }
        if (!userAnswer.mapping || !question.correctMapping) return false;
        const correctMapping = question.correctMapping;
        return Object.keys(correctMapping).every(targetId => {
          return userAnswer.mapping[targetId] === correctMapping[targetId];
        });
      
      default:
        return false;
    }
  };

  const doneCount = Object.values(answers).filter((x) => x?.answered).length;
  
  // Tính số câu đúng
  const correctCount = data ? data.questions.filter(q => {
    const userAnswer = answers[q.id];
    return userAnswer && userAnswer.answered && checkAnswer(q, userAnswer);
  }).length : 0;

  function complete(autoByTime = false) {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Chuẩn bị dữ liệu chi tiết để lưu
    const detailedAnswers = data.questions.map((q, index) => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer ? checkAnswer(q, userAnswer) : false;
      
      // Lấy answer data tùy theo type câu hỏi
      let answerData = null;
      if (userAnswer) {
        switch (q.type) {
          case 'single':
          case 'image_single':
          case 'image_grid':
            answerData = userAnswer.choice;
            break;
          case 'multi':
            answerData = userAnswer.choices;
            break;
          case 'binary':
            answerData = userAnswer.distribution;
            break;
          case 'dragdrop':
            answerData = userAnswer.mapping;
            break;
          default:
            answerData = userAnswer.selected || userAnswer.value;
        }
      }
      
      return {
        questionId: q.id,
        userAnswer: answerData,
        isCorrect: isCorrect,
        timeSpent: userAnswer?.timeSpent || 0
      };
    });

    // Tính thời gian đã làm bài (nếu có giới hạn thời gian)
    const quizTimeLimit = data.settings?.timeLimit ? data.settings.timeLimit * 60 : null;
    const timeSpentTotal = mode === "testing" && quizTimeLimit ? (quizTimeLimit - (timeLeft || 0)) : 0;
    
    const payload = { 
      quizId, 
      quizTitle: data.title,
      total, 
      done: correctCount, // Thay đổi: dùng số câu đúng thay vì số câu đã làm
      answered: doneCount, // Thêm: số câu đã trả lời
      answers: detailedAnswers,
      totalTimeSpent: timeSpentTotal,
      startedAt: new Date().toISOString(),
      sessionId: sessionId, // Thêm sessionId để track unique session
      hasTimeLimit: mode === "testing" && !!data.settings?.timeLimit, // Đánh dấu bài có giới hạn thời gian (testing mode)
      isRetry: isRetry, // Truyền retry flag
      originalAttemptId: originalAttemptId, // Truyền original attempt ID
      ts: Date.now(), 
      mode, 
      autoByTime 
    };
    
    sessionStorage.setItem("quizResult", JSON.stringify(payload));
    navigate(`/quiz/${quizId}/complete`, { state: payload });
  }

  const formatTime = (s) => {
    const m = Math.floor((s || 0) / 60);
    const r = (s || 0) % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  const immediateFeedback = mode === "training" && !!data.settings?.immediateFeedback;

  // ======= QUIZ NAV: xác định trạng thái màu cho từng câu =======
  const statusOf = (i) => {
    const q = data.questions[i];
    if (answers[q.id]?.answered) return "done";       
    if (skipped.has(q.id))         return "skipped";
    return "pending";                                   
  };

  const jumpTo = (i) => {
    setIdx(i);
    setQuestionStartTime(Date.now()); // Reset thời gian khi jump
  };

  return (
    <div className="quiz-layout" data-user={user?.username || 'Guest'}>
      {/* Sidebar điều hướng */}
      <aside className="quiz-nav">
        <div className="quiz-nav-title">Quá Trình</div>
        <div className="quiz-nav-grid">
          {data.questions.map((q, i) => {
            const st = statusOf(i);
            const isCurrent = i === idx;
            return (
              <button
                key={q.id}
                className={cx("nav-cell", st, isCurrent && "current")}
                onClick={() => jumpTo(i)}
                title={`Câu ${i + 1}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="quiz-nav-legend">
          <span className="legend-box done" /> Đã trả lời
          <span className="legend-box skipped" /> Bỏ qua
          <span className="legend-box pending" /> Chưa làm
        </div>
      </aside>

      {/* Nội dung chính */}
      <div className="quiz-main">
        <header className="quiz-head">
          <h1>{data.title}</h1>

          <div className="mode-row">
            <div className="mode-buttons">
              <button
                className={cx("btn", "btn-mode", mode === "training" && "active")}
                onClick={() => setMode("training")}
              >
                Training (không tính giờ)
              </button>
              <button
                className={cx("btn", "btn-mode", mode === "testing" && "active")}
                onClick={() => setMode("testing")}
                disabled={!data.settings?.timeLimit}
                title={!data.settings?.timeLimit ? "Bài này không có giới hạn thời gian" : ""}
              >
                Testing {data.settings?.timeLimit ? `(${data.settings.timeLimit} phút)` : '(không giới hạn)'}
              </button>
            </div>
            {mode === "testing" && data.settings?.timeLimit && (
              <div className={cx("timer", timeLeft !== null && timeLeft <= 30 && "warn")}>
                ⏱ {formatTime(timeLeft ?? 0)}
              </div>
            )}
          </div>

          <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
          <div className="progress-meta">
            Câu {idx + 1}/{total} • {pct}% • Đã hoàn thành: {doneCount}/{total}
          </div>
        </header>

        <ol className="quiz-list">
          {data.questions.map((q, i) => (
            <li key={q.id} className={cx("quiz-item", i !== idx && "hidden-question")} aria-hidden={i !== idx}>
              <Question
                q={q}
                index={i + 1}
                immediate={immediateFeedback}
                onAnswered={(info) => markAnswered(q.id, info)}
              />
            </li>
          ))}
        </ol>

        <div className="pager">
          <button className="btn" onClick={prev} disabled={idx === 0}>← Lùi lại</button>
          <div className="pager-gap" />
          {idx < total - 1 ? (
            <button className="btn btn-primary" onClick={next}>Tiếp tục →</button>
          ) : (
            <button className="btn btn-primary" onClick={() => complete(false)}>Hoàn tất</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==============================
   Các loại câu hỏi
   ============================== */
function Question({ q, index, immediate, onAnswered }) {
  return (
    <div className="card">
      <div className="q-title">
        <span className="badge">{index}</span>
        <div>
          <div className="prompt">{q.prompt}</div>
          {q.image && (
            <div className="img-wrap">
              <img src={q.image} alt="question" />
            </div>
          )}
        </div>
      </div>

      {q.type === "single" && <SingleChoice q={q} immediate={immediate} onAnswered={onAnswered} />}
      {q.type === "multi" && <MultiChoice q={q} immediate={immediate} onAnswered={onAnswered} />}
      {q.type === "binary" && <BinaryTwoCols q={q} onAnswered={onAnswered} />}
      {q.type === "dragdrop" && <DragDropTargets q={q} onAnswered={onAnswered} />}
      {q.type === "image_single" && <SingleChoice q={q} immediate={immediate} onAnswered={onAnswered} />}
      {q.type === "image_grid" && <ImageGridChoice q={q} immediate={immediate} onAnswered={onAnswered} />}
      {q.type === "coordinate" && <CoordinateQuestion q={q} immediate={immediate} onAnswered={onAnswered} />}
    </div>
  );
}

/* ========== Loại 1 / 5: chọn 1 đáp án ========== */
function SingleChoice({ q, immediate, onAnswered }) {
  const [sel, setSel] = useState(null);
  const isCorrect = sel && sel === q.correct;
  const showCorrect = immediate && sel && sel !== q.correct;

  const choose = (id) => {
    setSel(id);
    onAnswered?.({ correct: id === q.correct, choice: id });
  };

  return (
    <>
      <div className="options">
        {q.options.map((o) => {
          const chosen = sel === o.id;
          const wrong = immediate && chosen && o.id !== q.correct;
          const right = immediate && o.id === q.correct && chosen;
          return (
            <button
              key={o.id}
              className={cx("opt", chosen && "opt-chosen", right && "opt-correct", wrong && "opt-wrong")}
              onClick={() => choose(o.id)}
            >
              <span className="opt-id">{o.id}</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>

      {showCorrect && (
        <div className="feedback">
          ❌ Sai. Đáp án đúng: <strong>{q.correct}</strong> – {q.options.find((o) => o.id === q.correct)?.text}
        </div>
      )}
      {sel && !immediate && (
        <div className="feedback">{isCorrect ? "✅ Chính xác!" : `❌ Sai. Đáp án đúng là ${q.correct}.`}</div>
      )}
    </>
  );
}

/* ========== Loại 2: chọn nhiều đáp án ========== */
function MultiChoice({ q, immediate, onAnswered }) {
  const [sels, setSels] = useState(new Set());
  const toggle = (id) =>
    setSels((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      const done = n.size > 0;
      const isAllCorrect = done && equalSets(n, new Set(q.correct));
      onAnswered?.({ correct: isAllCorrect, choices: Array.from(n) });
      return n;
    });

  const done = q.maxCorrect ? sels.size === q.maxCorrect : sels.size >= (q.minCorrect || 1);
  const isAllCorrect = done && equalSets(sels, new Set(q.correct));

  return (
    <>
      <div className="options">
        {q.options.map((o) => {
          const chosen = sels.has(o.id);
          const shouldBe = q.correct.includes(o.id);
          const wrong = immediate && chosen && !shouldBe;
          const right = immediate && chosen && shouldBe;
          return (
            <button
              key={o.id}
              className={cx("opt", "opt-multi", chosen && "opt-chosen", right && "opt-correct", wrong && "opt-wrong")}
              onClick={() => toggle(o.id)}
            >
              <span className="opt-id">{o.id}</span>
              <span>{o.text}</span>
              <span className="check">{chosen ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>

      {immediate && done && (
        <div className="feedback">
          {isAllCorrect ? "✅ Chính xác!" : (
            <>
              ❌ Chưa đúng. Đáp án đúng: <strong>{q.correct.join(", ")}</strong>
              {q.options.filter((o) => q.correct.includes(o.id)).map((o) => (
                <div key={o.id} className="explain">• {o.id} – {o.text}</div>
              ))}
            </>
          )}
        </div>
      )}

      {!immediate && (
        <div className="hint">Chọn {q.maxCorrect || q.correct.length} đáp án rồi ấn “Kiểm tra”.</div>
      )}
    </>
  );
}
const equalSets = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

/* ========== New: Image grid single-choice (4 images) ========== */
function ImageGridChoice({ q, immediate, onAnswered }) {
  const [sel, setSel] = useState(null);
  const isCorrect = sel && sel === q.correct;
  const showCorrect = immediate && sel && sel !== q.correct;

  const choose = (id) => {
    setSel(id);
    onAnswered?.({ correct: id === q.correct, choice: id });
  };

  return (
    <>
      <div className="image-grid-choice">
        {q.options.map((o) => {
          const chosen = sel === o.id;
          const wrong = immediate && chosen && o.id !== q.correct;
          const right = immediate && chosen && o.id === q.correct;
          return (
            <button
              key={o.id}
              className={cx("img-opt", chosen && "opt-chosen", right && "opt-correct", wrong && "opt-wrong")}
              onClick={() => choose(o.id)}
            >
              <div className="img-opt-wrap">
                <img src={o.text} alt={o.id} />
              </div>
              <div className="img-opt-id">{o.id}</div>
            </button>
          );
        })}
      </div>

      {showCorrect && (
        <div className="feedback">
          ❌ Sai. Đáp án đúng: <strong>{q.correct}</strong>
        </div>
      )}
      {sel && !immediate && (
        <div className="feedback">{isCorrect ? "✅ Chính xác!" : `❌ Sai. Đáp án đúng là ${q.correct}.`}</div>
      )}
    </>
  );
}

/* ========== Loại 3: 2 cột Có / Không ========== */
function BinaryTwoCols({ q, onAnswered }) {
  const [left, setLeft] = useState(q.items.map((i) => i.id));
  const [right, setRight] = useState([]);
  const [checked, setChecked] = useState(false);

  const move = (id, toRight) => {
    if (toRight) {
      setLeft((L) => L.filter((x) => x !== id));
      setRight((R) => (R.includes(id) ? R : [...R, id]));
    } else {
      setRight((R) => R.filter((x) => x !== id));
      setLeft((L) => (L.includes(id) ? L : [...L, id]));
    }
  };

  const getItem = (id) => q.items.find((x) => x.id === id);
  const isCorrectLeft = (id) => getItem(id).correctColumn === q.columns[0];
  const isCorrectRight = (id) => getItem(id).correctColumn === q.columns[1];

  const doCheck = () => {
    setChecked(true);
    const allIds = [...left.map((id) => ({ id, side: "left" })), ...right.map((id) => ({ id, side: "right" }))];
    const allCorrect = allIds.every(({ id, side }) =>
      (side === "left" && isCorrectLeft(id)) || (side === "right" && isCorrectRight(id))
    );
    onAnswered?.({ correct: allCorrect, distribution: { left, right } });
  };

  return (
    <>
      <div className="binary">
        <Column title={q.columns[0]} ids={left}  item={getItem} checked={checked} isCorrect={(id)=>isCorrectLeft(id)}  onToggle={(id) => move(id, true)} />
        <Column title={q.columns[1]} ids={right} item={getItem} checked={checked} isCorrect={(id)=>isCorrectRight(id)} onToggle={(id) => move(id, false)} />
      </div>
      <div className="actions">
        <button className="btn" onClick={doCheck}>Kiểm tra</button>
        <button className="btn btn-light" onClick={() => { setChecked(false); setLeft(q.items.map(i=>i.id)); setRight([]); }}>
          Làm lại
        </button>
      </div>
    </>
  );
}
function Column({ title, ids, item, checked, isCorrect, onToggle }) {
  return (
    <div className="col">
      <div className="col-title">{title}</div>
      <ul className="col-list">
        {ids.map((id) => {
          const it = item(id);
          const ok = checked && isCorrect(id);
          const bad = checked && !isCorrect(id);
          return (
            <li key={id} className={cx("pill", ok && "ok", bad && "bad")} onClick={() => onToggle(id)}>
              {it.text}
              {checked && bad && <span className="sol"> → Đúng: {it.correctColumn}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ========== Loại 4: kéo/thả vào ô ========== */
function DragDropTargets({ q, onAnswered }) {
  const [mapping, setMapping] = useState({});
  const [checked, setChecked] = useState(false);
  const used = new Set(Object.values(mapping));
  const unusedBank = q.bank.filter((o) => !used.has(o.id));

  const onDropMap = (targetId, optionId) => setMapping((m) => ({ ...m, [targetId]: optionId }));
  const clear = (targetId) => setMapping((m) => { const n = {...m}; delete n[targetId]; return n; });

  const correct = (tId) => mapping[tId] && q.correctMapping[tId] === mapping[tId];

  const handleDragStart = (e, optionId) => e.dataTransfer.setData("text/opt", optionId);
  const handleDrop = (e, targetId) => {
    const optionId = e.dataTransfer.getData("text/opt");
    if (optionId) onDropMap(targetId, optionId);
  };
  const allowDrop = (e) => e.preventDefault();

  const doCheck = () => {
    setChecked(true);
    const allTargets = q.targets.map((t) => t.id);
    const allCorrect = allTargets.every((tId) => correct(tId));
    onAnswered?.({ correct: allCorrect, mapping: { ...mapping } });
  };

  return (
    <>
      <div className="dragdrop">
        <div className="targets">
          {q.targets.map((t) => {
            const opt = mapping[t.id] && q.bank.find((b) => b.id === mapping[t.id]);
            const ok = checked && correct(t.id);
            const bad = checked && mapping[t.id] && !correct(t.id);
            return (
              <div
                key={t.id}
                className={cx("target", ok && "ok", bad && "bad")}
                onDragOver={allowDrop}
                onDrop={(e) => handleDrop(e, t.id)}
              >
                <div className="t-label">{t.label}</div>
                <div className="t-slot">
                  {opt ? (
                    <span className="chip">
                      {opt.text}
                      <button className="x" onClick={() => clear(t.id)}>×</button>
                    </span>
                  ) : (
                    <span className="hint">Kéo đáp án vào đây</span>
                  )}
                </div>
                {checked && bad && (
                  <div className="sol">
                    Đúng: {q.bank.find((b) => b.id === q.correctMapping[t.id])?.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bank">
          <div className="bank-title">Ngân hàng đáp án</div>
          <div className="bank-list">
            {unusedBank.map((o) => (
              <div key={o.id} className="chip draggable" draggable onDragStart={(e) => handleDragStart(e, o.id)}>
                {o.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn" onClick={doCheck}>Kiểm tra</button>
        <button className="btn btn-light" onClick={() => { setChecked(false); setMapping({}); }}>
          Làm lại
        </button>
      </div>
    </>
  );
}

/* ========== Loại 6: Tìm tọa độ đúng trên hình ảnh ========== */
function CoordinateQuestion({ q, immediate, onAnswered }) {
  const [clickPosition, setClickPosition] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const imageRef = useRef(null);

  const calculateDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  const handleImageClick = (e) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Convert to percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setClickPosition({ x, y });
    
    // Check if click is within radius of correct position
    const distance = calculateDistance(x, y, q.correctCoordinate.x, q.correctCoordinate.y);
    const radius = q.correctCoordinate.radius || 30;
    const correct = distance <= (radius / rect.width) * 100; // Convert radius to percentage
    
    setIsCorrect(correct);
    onAnswered?.({ correct, clickedPosition: { x, y } });
  };

  return (
    <>
      <div className="coordinate-container">
        <div className="coordinate-image-wrapper" style={{ position: 'relative', cursor: 'crosshair' }}>
          <img 
            ref={imageRef}
            src={q.image} 
            alt="coordinate question" 
            onClick={handleImageClick}
            style={{ 
              width: '100%', 
              display: 'block',
              userSelect: 'none'
            }}
          />
          {clickPosition && (
            <div 
              className="coordinate-marker"
              style={{
                position: 'absolute',
                left: `${clickPosition.x}%`,
                top: `${clickPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: isCorrect ? '#22c55e' : '#ef4444',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            />
          )}
          {immediate && isCorrect === false && (
            <div 
              className="coordinate-correct-marker"
              style={{
                position: 'absolute',
                left: `${q.correctCoordinate.x}%`,
                top: `${q.correctCoordinate.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '3px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 9,
                pointerEvents: 'none',
                animation: 'pulse 1.5s infinite'
              }}
            />
          )}
        </div>
        <div className="coordinate-hint" style={{ 
          marginTop: '12px', 
          fontSize: '14px', 
          color: '#666',
          textAlign: 'center'
        }}>
          🎯 Nhấp vào vị trí chính xác trên hình ảnh
        </div>
      </div>

      {clickPosition && (
        <div className="feedback">
          {isCorrect ? "✅ Chính xác! Bạn đã tìm đúng vị trí." : "❌ Sai vị trí. Hãy thử lại."}
        </div>
      )}
    </>
  );
}
