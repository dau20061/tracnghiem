import React, { useCallback, useEffect, useState } from "react";
import { API_URL } from '../../config/api';

import "./admin.css";

function makeEmptyQuestion(i = 1) {
  return {
    id: `q${i}`,
    type: "single",
    prompt: "",
    options: [ { id: "A", text: "" }, { id: "B", text: "" } ],
    correct: "A",
  };
}

export default function AdminPage() {
  const [quizId, setQuizId] = useState("");
  const [quizList, setQuizList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [quiz, setQuiz] = useState(null); // { _id, title, settings, questions }
  const [showRaw, setShowRaw] = useState(false);
  const [localPreviews, setLocalPreviews] = useState({}); // key -> preview URL (objectUrl or server URL)

  const fetchQuizList = useCallback(async () => {
    setListLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_URL}/api/quizzes`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Không tải được danh sách quiz");
      setQuizList(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      setErr(e.message);
      setQuizList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizList();
  }, [fetchQuizList]);

  const loadQuiz = async (id) => {
    const targetId = id || quizId;
    if (!targetId) {
      setErr("Vui lòng chọn quiz");
      return;
    }
    setErr(""); setSavedMsg(""); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/quizzes/${encodeURIComponent(targetId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Lỗi khi tải quiz");
      setQuizId(targetId);
      setQuiz(json);
    } catch (e) {
      setErr(e.message);
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  };

  const newQuiz = () => {
    setErr("");
    setSavedMsg("");
    const tmpl = {
      _id: quizId || "my-quiz-id",
      title: "Tiêu đề mới",
      settings: { immediateFeedback: false },
      questions: [ makeEmptyQuestion(1) ],
    };
    setQuiz(tmpl);
    setQuizId(tmpl._id);
    setShowRaw(false);
  };

  const saveQuiz = async () => {
    setErr(""); setSavedMsg("");
    if (!quiz) return setErr("Không có quiz để lưu");
    if (!quiz._id) return setErr("Quiz cần trường _id");

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Lỗi khi lưu quiz");
      setSavedMsg(`Saved: ${json.message || "OK"}`);
      fetchQuizList();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (id) => {
    const targetId = id || quiz?._id;
    if (!targetId) {
      setErr("Không có quiz để xoá");
      return;
    }
    if (!window.confirm(`Xoá quiz ${targetId}?`)) return;
    setLoading(true);
    setErr("");
    setSavedMsg("");
    try {
      const res = await fetch(`${API_URL}/api/quizzes/${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Không xoá được quiz");
      setSavedMsg(json?.message || "Đã xoá quiz");
      setQuiz(null);
      setQuizId("");
      fetchQuizList();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Helpers to update quiz state
  const updateMeta = (patch) => setQuiz((q) => ({ ...(q || {}), ...patch }));
  const updateQuestion = (idx, patch) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    copy.questions[idx] = { ...(copy.questions[idx] || {}), ...patch };
    return copy;
  });
  const addQuestion = () => setQuiz((q) => {
    const copy = { ...(q || { _id: quizId || "new-quiz", title: "", settings: {}, questions: [] }) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    copy.questions.push(makeEmptyQuestion(copy.questions.length + 1));
    return copy;
  });
  const removeQuestion = (idx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    copy.questions.splice(idx, 1);
    return copy;
  });

  // Option helpers for single/multi
  const addOption = (qIdx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const ques = { ...(copy.questions[qIdx] || {}) };
    ques.options = ques.options ? [...ques.options] : [];
    const nextId = String.fromCharCode(65 + ques.options.length); // A, B, C...
    ques.options.push({ id: nextId, text: "" });
    copy.questions[qIdx] = ques;
    return copy;
  });
  
  const uploadImageFile = async (file, qIdx, optIdx) => {
    if (!file) return;
    const key = `${qIdx}-${optIdx}`;
    // create an object URL for immediate preview
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviews((p) => ({ ...p, [key]: objectUrl }));

    setLoading(true); setErr(""); setSavedMsg("");
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/images/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload lỗi');
      // json.url is like /api/images/:id — form absolute URL to load from backend
      const origin = window.location.origin.replace(/:\d+$/, ':4000');
      const url = json.url.startsWith('/') ? `${origin}${json.url}` : json.url;
      // set the option text to server URL and update preview to server URL
      updateOptionText(qIdx, optIdx, url);
      setLocalPreviews((p) => {
        const prev = p[key];
        // revoke the object URL if it was a blob url (not server url)
        try { if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev); } catch(_){}
        return { ...p, [key]: url };
      });
      setSavedMsg('Ảnh đã tải lên');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  const updateOptionText = (qIdx, optIdx, text) => setQuiz((q)=>{
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const ques = { ...(copy.questions[qIdx] || {}) };
    ques.options = ques.options ? [...ques.options] : [];
    ques.options[optIdx] = { ...(ques.options[optIdx] || {}), text };
    copy.questions[qIdx] = ques;
    return copy;
  });
  // keep preview in sync when user types/pastes a URL
  const updateOptionTextAndPreview = (qIdx, optIdx, text) => {
    updateOptionText(qIdx, optIdx, text);
    const key = `${qIdx}-${optIdx}`;
    setLocalPreviews((p) => ({ ...p, [key]: text }));
  };
  const removeOption = (qIdx, optIdx) => setQuiz((q)=>{
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const ques = { ...(copy.questions[qIdx] || {}) };
    ques.options = ques.options ? [...ques.options] : [];
    ques.options.splice(optIdx, 1);
    copy.questions[qIdx] = ques;
    return copy;
  });

  // UI for each question
  const QuestionEditor = ({ qObj, idx }) => {
    if (!qObj) return null;
    return (
      <div className="q-editor">
        <div className="q-row">
          <label>ID</label>
          <input value={qObj.id} onChange={(e)=>updateQuestion(idx, { id: e.target.value })} />
          <label>Type</label>
          <select value={qObj.type} onChange={(e)=>{
            const newType = e.target.value;
            if (newType === 'image_grid') {
              // ensure 4 options for image grid
              const opts = [
                { id: 'A', text: '' },
                { id: 'B', text: '' },
                { id: 'C', text: '' },
                { id: 'D', text: '' },
              ];
              updateQuestion(idx, { type: newType, options: opts, correct: 'A' });
            } else {
              updateQuestion(idx, { type: newType });
            }
          }}>
            <option value="single">Single</option>
            <option value="multi">Multi</option>
            <option value="binary">Binary (2-col)</option>
            <option value="dragdrop">DragDrop</option>
            <option value="image_single">Image Single</option>
            <option value="image_grid">Image Grid (4 images)</option>
          </select>
          <button className="btn btn-light" onClick={()=>removeQuestion(idx)}>Xóa câu</button>
        </div>

        <div className="q-row">
          <label>Prompt</label>
          <input value={qObj.prompt || ""} onChange={(e)=>updateQuestion(idx, { prompt: e.target.value })} style={{flex:1}} />
        </div>

        {qObj.type === "single" && (
          <div className="options-box">
            <div className="opts-title">Các lựa chọn</div>
            { (qObj.options || []).map((o, oi) => (
              <div key={oi} className="opt-row">
                <div className="opt-id">{o.id}</div>
                <input value={o.text} onChange={(e)=>updateOptionText(idx, oi, e.target.value)} />
                <label>Đúng?</label>
                <input type="radio" name={`correct-${idx}`} checked={qObj.correct === o.id} onChange={()=>updateQuestion(idx, { correct: o.id })} />
                <button className="btn btn-light" onClick={()=>removeOption(idx, oi)}>−</button>
              </div>
            )) }
            <div>
              <button className="btn" onClick={()=>addOption(idx)}>Thêm đáp án</button>
            </div>
          </div>
        )}

        {qObj.type === "image_single" && (
          <div className="options-box">
            <div className="opts-title">Các hình ảnh</div>
            {(qObj.options || []).map((o, oi) => {
              const key = `${idx}-${oi}`;
              const previewSrc = localPreviews[key] || o.text || "";
              const hasLocalPreview = Object.prototype.hasOwnProperty.call(localPreviews, key);
              return (
                <div key={oi} className="image-option">
                  <div className="image-option-head">
                    <div className="opt-id">{o.id}</div>
                    <input
                      value={o.text}
                      placeholder={`URL hình ${o.id}`}
                      onChange={(e)=>updateOptionTextAndPreview(idx, oi, e.target.value)}
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e)=>uploadImageFile(e.target.files?.[0], idx, oi)}
                  />
                  <div className="img-preview">
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt={o.id}
                        onError={() => {
                          if (hasLocalPreview) {
                            setLocalPreviews((p) => {
                              if (!Object.prototype.hasOwnProperty.call(p, key)) return p;
                              const next = { ...p };
                              delete next[key];
                              return next;
                            });
                          }
                          console.warn('Không thể tải preview ảnh', previewSrc);
                        }}
                      />
                    ) : (
                      <span className="empty">Preview</span>
                    )}
                  </div>
                  <div className="image-option-meta">
                    <label>Đúng?</label>
                    <input
                      type="radio"
                      name={`correct-img-single-${idx}`}
                      checked={qObj.correct === o.id}
                      onChange={()=>updateQuestion(idx, { correct: o.id })}
                    />
                    <button className="btn btn-light" onClick={()=>removeOption(idx, oi)}>−</button>
                  </div>
                </div>
              );
            })}
            <div>
              <button className="btn" onClick={()=>addOption(idx)}>Thêm đáp án</button>
            </div>
          </div>
        )}

        {qObj.type === "multi" && (
          <div className="options-box">
            <div className="opts-title">Các lựa chọn (chọn nhiều)</div>
            { (qObj.options || []).map((o, oi) => (
              <div key={oi} className="opt-row">
                <div className="opt-id">{o.id}</div>
                <input value={o.text} onChange={(e)=>updateOptionText(idx, oi, e.target.value)} />
                <label>Đúng?</label>
                <input type="checkbox" checked={(qObj.correct || []).includes(o.id)} onChange={(e)=>{
                  const cur = new Set(qObj.correct || []);
                  if (e.target.checked) cur.add(o.id); else cur.delete(o.id);
                  updateQuestion(idx, { correct: Array.from(cur) });
                }} />
                <button className="btn btn-light" onClick={()=>removeOption(idx, oi)}>−</button>
              </div>
            )) }
            <div>
              <button className="btn" onClick={()=>addOption(idx)}>Thêm đáp án</button>
            </div>
          </div>
        )}

        {qObj.type === "image_grid" && (
          <div className="options-box">
            <div className="opts-title">4 hình ảnh (nhập URL)</div>
            <div className="image-grid">
              { (qObj.options || []).map((o, oi) => (
                <div key={oi} className="image-item">
                  <div className="opt-id">{o.id}</div>
                  <input value={o.text} placeholder={`URL hình ${o.id}`} onChange={(e)=>updateOptionTextAndPreview(idx, oi, e.target.value)} />
                  <input type="file" accept="image/*" onChange={(e)=>uploadImageFile(e.target.files?.[0], idx, oi)} />
                  <div className="img-preview">{(localPreviews[`${idx}-${oi}`] || o.text) ? <img src={localPreviews[`${idx}-${oi}`] || o.text} alt={o.id} /> : <span className="empty">Preview</span>}</div>
                  <label>Đúng?</label>
                  <input type="radio" name={`correct-img-${idx}`} checked={qObj.correct === o.id} onChange={()=>updateQuestion(idx, { correct: o.id })} />
                </div>
              )) }
            </div>
          </div>
        )}

        {/* For complex types show a small hint and fallback to raw editing */}
        {(qObj.type === "binary" || qObj.type === "dragdrop") && (
          <div className="hint">Loại câu này hơi phức tạp — chuyển sang chế độ Raw JSON để chỉnh chi tiết nếu cần.</div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-wrap">
      <header className="admin-head">
        <h1>Admin — Quản lý Quiz</h1>
        <div className="admin-actions">
          <input
            placeholder="Nhập mã quiz"
            value={quizId}
            onChange={(e)=>setQuizId(e.target.value)}
          />
          <button className="btn" onClick={() => loadQuiz()} disabled={loading}>Tải</button>
          <button className="btn" onClick={newQuiz}>Tạo mới</button>
          <button className="btn btn-light" onClick={() => deleteQuiz()} disabled={!quiz}>
            Xoá
          </button>
          <button className="btn btn-primary" onClick={saveQuiz} disabled={loading}>Lưu</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-split">
          <aside className="quiz-list-panel">
            <div className="quiz-list-head">
              <h2>Danh sách bài quiz</h2>
              <button className="btn btn-light" onClick={fetchQuizList} disabled={listLoading}>
                {listLoading ? "Đang tải..." : "Tải lại"}
              </button>
            </div>
            <div className="quiz-list-body">
              {quizList.length === 0 && !listLoading ? (
                <div className="quiz-list-empty">Chưa có dữ liệu.</div>
              ) : (
                <ul>
                  {quizList.map((item) => (
                    <li key={item._id} className={item._id === quiz?._id ? "active" : ""}>
                      <button type="button" onClick={() => loadQuiz(item._id)}>
                        <span className="quiz-id">{item._id}</span>
                        <span className="quiz-title">{item.title}</span>
                      </button>
                      <span
                        className="quiz-delete"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteQuiz(item._id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            deleteQuiz(item._id);
                          }
                        }}
                      >
                        ✕
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <section className="quiz-editor-panel">
        {loading && <div className="notice">Đang xử lý…</div>}
        {err && <div className="error">Lỗi: {err}</div>}
        {savedMsg && <div className="saved">{savedMsg}</div>}

        {quiz ? (
          <div className="quiz-form">
            <div className="meta-row">
              <label>_id</label>
              <input value={quiz._id || ""} onChange={(e)=>updateMeta({_id: e.target.value})} />
              <label>Title</label>
              <input value={quiz.title || ""} onChange={(e)=>updateMeta({title: e.target.value})} style={{flex:1}} />
              <label>Immediate FB</label>
              <input type="checkbox" checked={!!quiz.settings?.immediateFeedback} onChange={(e)=>updateMeta({settings: {...(quiz.settings||{}), immediateFeedback: e.target.checked}})} />
            </div>

            <div className="questions-list">
              <div className="questions-head">
                <h3>Câu hỏi</h3>
                <button className="btn" onClick={addQuestion}>Thêm câu</button>
                <button className="btn btn-light" onClick={()=>setShowRaw(s=>!s)}>{showRaw ? 'Ẩn Raw' : 'Hiện Raw'}</button>
              </div>

              {quiz.questions && quiz.questions.map((qObj, i) => (
                <div key={i} className="question-item">
                  <QuestionEditor qObj={qObj} idx={i} />
                </div>
              ))}
            </div>

            {showRaw && (
              <div style={{marginTop:12}}>
                <div className="opts-title">Raw JSON (chỉnh nâng cao)</div>
                <textarea className="json-editor" value={JSON.stringify(quiz, null, 2)} onChange={(e)=>{
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setQuiz(parsed);
                    setErr("");
                  } catch (ex) {
                    setErr("Raw JSON không hợp lệ: " + ex.message);
                  }
                }} spellCheck={false} />
              </div>
            )}
          </div>
        ) : (
          <div className="hint">Chưa có quiz. Nhấn Tạo mới hoặc Tải để bắt đầu.</div>
        )}
          </section>
        </div>
      </main>
    </div>
  );
}
