// src/page/quiz/QuizPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./quiz.css";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [idx, setIdx] = useState(0); // câu hiện tại
  const [answers, setAnswers] = useState({}); // { [qId]: { answered: true, correct?: boolean, meta?: any } }

  // helper: đánh dấu đã trả lời
  const markAnswered = (qid, info = {}) =>
    setAnswers((prev) => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...info, answered: true } }));

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr("");
      try {
        const res = await fetch(`http://localhost:4000/api/quizzes/${encodeURIComponent(quizId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không tải được đề");
        setData(json);
        setIdx(0);
        setAnswers({});
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [quizId]);

  useEffect(() => {
    if (!loading) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [idx, loading]);

  if (loading) return <div className="quiz-wrap">Đang tải đề…</div>;
  if (err)      return <div className="quiz-wrap" style={{color:"#dc2626"}}>Lỗi: {err}</div>;
  if (!data)    return <div className="quiz-wrap">Không có dữ liệu</div>;

  const total = data.questions.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(total - 1, i + 1));

  const doneCount = Object.values(answers).filter((x) => x?.answered).length;

  const complete = () => {
    const payload = { quizId, total, done: doneCount, ts: Date.now() };
    sessionStorage.setItem("quizResult", JSON.stringify(payload));
    navigate(`/quiz/${quizId}/complete`, { state: { total, done: doneCount } });
  };

  return (
    <div className="quiz-wrap">
      <header className="quiz-head">
        <h1>{data.title}</h1>
        <p>Demo 5 loại câu hỏi với phản hồi tức thì.</p>

        <div className="progress">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
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
              immediate={!!data.settings?.immediateFeedback}
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
          <button className="btn btn-primary" onClick={complete}>Hoàn tất</button>
        )}
      </div>
    </div>
  );
}

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

/* ========== Loại 2: chọn nhiều đáp án (2 đúng) ========== */
function MultiChoice({ q, immediate, onAnswered }) {
  const [sels, setSels] = useState(new Set());
  const toggle = (id) =>
    setSels((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      // Đánh dấu đã trả lời nếu có ít nhất 1 chọn
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
          {isAllCorrect ? (
            "✅ Chính xác!"
          ) : (
            <>
              ❌ Chưa đúng. Đáp án đúng: <strong>{q.correct.join(", ")}</strong>
              {q.options
                .filter((o) => q.correct.includes(o.id))
                .map((o) => (
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
    // coi là “đã hoàn thành” khi người dùng bấm Kiểm tra
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
  const [mapping, setMapping] = useState({}); // targetId -> optionId
  const [checked, setChecked] = useState(false);
  const used = new Set(Object.values(mapping));
  const unusedBank = q.bank.filter((o) => !used.has(o.id));

  const onDropMap = (targetId, optionId) => setMapping((m) => ({ ...m, [targetId]: optionId }));
  const clear = (targetId) => setMapping((m) => { const n = {...m}; delete n[targetId]; return n; });

  const correct = (tId) => mapping[tId] && q.correctMapping[tId] === mapping[tId];

  // HTML5 drag
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
