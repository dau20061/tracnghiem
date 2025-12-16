import React, { useCallback, useEffect, useState, memo, useRef } from "react";
import { API_URL } from '../../config/api';

import "./admin.css";

// Coordinate Editor Component
const CoordinateEditor = memo(({ qObj, idx, updateQuestion, localPreviews, setLocalPreviews }) => {
  const imageRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  
  const handleImageUpload = async (file) => {
    if (!file) return;
    
    const key = `coord-${idx}`;
    // Create object URL for immediate preview
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviews((p) => ({ ...p, [key]: objectUrl }));
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(`${API_URL}/api/images/upload`, {
        method: "POST",
        body: formData,
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Upload lỗi");
      
      // Convert relative URL to absolute URL
      const url = json.url.startsWith('/') ? `${API_URL}${json.url}` : json.url;
      
      // Update question with server URL
      updateQuestion(idx, { image: url });
      
      // Update preview to server URL and revoke object URL
      setLocalPreviews((p) => {
        const prev = p[key];
        try { if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev); } catch(_){}
        return { ...p, [key]: url };
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Không thể upload ảnh: " + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  const handleImageClick = (e) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newCoord = {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      radius: 30
    };
    
    const existingCoords = qObj.correctCoordinates || [];
    updateQuestion(idx, {
      correctCoordinates: [...existingCoords, newCoord]
    });
  };
  
  const removeCoordinate = (coordIdx) => {
    const coords = [...(qObj.correctCoordinates || [])];
    coords.splice(coordIdx, 1);
    updateQuestion(idx, { correctCoordinates: coords });
  };
  
  const updateCoordinateRadius = (coordIdx, newRadius) => {
    const coords = [...(qObj.correctCoordinates || [])];
    if (coords[coordIdx]) {
      coords[coordIdx] = { ...coords[coordIdx], radius: newRadius };
      updateQuestion(idx, { correctCoordinates: coords });
    }
  };
  
  const imageUrl = localPreviews[`coord-${idx}`] || qObj.image || "";
  
  return (
    <div className="options-box coordinate-editor-box">
      <div className="opts-title">Thiết lập câu hỏi tọa độ</div>
      
      <div className="coordinate-upload">
        <label>Hình ảnh:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e.target.files?.[0])}
          disabled={uploading}
        />
        <input
          type="text"
          value={qObj.image || ""}
          placeholder="Hoặc nhập URL hình ảnh"
          onChange={(e) => {
            const url = e.target.value;
            updateQuestion(idx, { image: url });
            setLocalPreviews(prev => ({ ...prev, [`coord-${idx}`]: url }));
          }}
        />
        {uploading && <span>Đang upload...</span>}
      </div>
      
      {imageUrl && (
        <div className="coordinate-preview">
          <p className="coordinate-instruction">
            🎯 Nhấp vào vị trí trên hình để thêm tọa độ đúng (có thể thêm nhiều điểm)
          </p>
          <div 
            className="coordinate-image-container"
            style={{
              position: 'relative',
              maxWidth: '600px',
              cursor: 'crosshair',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="coordinate setup"
              onClick={handleImageClick}
              style={{ width: '100%', display: 'block' }}
            />
            {(qObj.correctCoordinates || []).map((coord, coordIdx) => (
              <div
                key={coordIdx}
                className="coordinate-marker-admin"
                style={{
                  position: 'absolute',
                  left: `${coord.x}%`,
                  top: `${coord.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '-22px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#22c55e',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  {coordIdx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="coordinate-settings">
        <div style={{ marginBottom: '12px' }}>
          <strong>Danh sách tọa độ đúng:</strong> {(qObj.correctCoordinates || []).length} điểm
        </div>
        
        {(qObj.correctCoordinates || []).length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Chưa có tọa độ nào. Nhấp vào hình để thêm.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(qObj.correctCoordinates || []).map((coord, coordIdx) => (
              <div 
                key={coordIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto auto',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '8px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e6eef6'
                }}
              >
                <span style={{ fontWeight: 'bold', color: '#22c55e' }}>#{coordIdx + 1}</span>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  ({coord.x.toFixed(1)}%, {coord.y.toFixed(1)}%)
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  R:
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={coord.radius || 30}
                    onChange={(e) => updateCoordinateRadius(coordIdx, Number(e.target.value))}
                    style={{ width: '60px', padding: '4px', fontSize: '12px' }}
                  />
                  px
                </label>
                <button
                  className="btn btn-light"
                  onClick={() => removeCoordinate(coordIdx)}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function makeEmptyQuestion(i = 1) {
  return {
    id: `q${i}`,
    type: "single",
    prompt: "",
    options: [ { id: "A", text: "" }, { id: "B", text: "" } ],
    correct: "A",
  };
}

// Tách QuestionEditor ra ngoài và memo để tránh re-render
const QuestionEditor = memo(({ 
  qObj, 
  idx, 
  updateQuestion, 
  removeQuestion, 
  addOption, 
  updateOptionText, 
  updateOptionTextAndPreview,
  uploadImageFile,
  removeOption,
  normalizeBinaryQuestion,
  normalizeDragQuestion,
  updateBinaryColumn,
  addBinaryItem,
  updateBinaryItem,
  removeBinaryItem,
  addDragBankOption,
  updateDragBankOption,
  removeDragBankOption,
  addDragTarget,
  updateDragTarget,
  updateDragTargetMapping,
  removeDragTarget,
  localPreviews,
  setLocalPreviews
}) => {
  if (!qObj) return null;
  const binaryData = qObj.type === "binary" ? normalizeBinaryQuestion(qObj) : null;
  const dragData = qObj.type === "dragdrop" ? normalizeDragQuestion(qObj) : null;
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
            return;
          }
          if (newType === 'binary') {
            const normalized = normalizeBinaryQuestion(qObj);
            updateQuestion(idx, { type: newType, columns: normalized.columns, items: normalized.items });
            return;
          }
          if (newType === 'dragdrop') {
            const normalized = normalizeDragQuestion(qObj);
            updateQuestion(idx, {
              type: newType,
              bank: normalized.bank,
              targets: normalized.targets,
              correctMapping: normalized.correctMapping
            });
            return;
          }
          updateQuestion(idx, { type: newType });
        }}>
          <option value="single">Single</option>
          <option value="multi">Multi</option>
          <option value="binary">Binary (2-col)</option>
          <option value="dragdrop">DragDrop</option>
          <option value="image_single">Image Single</option>
          <option value="image_grid">Image Grid (4 images)</option>
          <option value="coordinate">Coordinate (Click on Image)</option>
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

      {qObj.type === "binary" && binaryData && (
        <div className="options-box binary-box">
          <div className="opts-title">Thiết lập cột</div>
          <div className="binary-columns">
            <label>
              Cột 1
              <input
                value={binaryData.columns[0]}
                onChange={(e)=>updateBinaryColumn(idx, 0, e.target.value)}
              />
            </label>
            <label>
              Cột 2
              <input
                value={binaryData.columns[1]}
                onChange={(e)=>updateBinaryColumn(idx, 1, e.target.value)}
              />
            </label>
          </div>

          <div className="opts-title" style={{ marginTop: 12 }}>Các phát biểu</div>
          {binaryData.items.map((item, itemIdx) => (
            <div key={item.id || itemIdx} className="binary-item-row">
              <div className="opt-id">{itemIdx + 1}</div>
              <input
                value={item.text}
                placeholder={`Nội dung phát biểu ${itemIdx + 1}`}
                onChange={(e)=>updateBinaryItem(idx, itemIdx, { text: e.target.value })}
              />
              <select
                value={item.correctColumn}
                onChange={(e)=>updateBinaryItem(idx, itemIdx, { correctColumn: e.target.value })}
              >
                {binaryData.columns.map((col, colIdx) => (
                  <option key={`${col}-${colIdx}`} value={col}>{col || `Cột ${colIdx + 1}`}</option>
                ))}
              </select>
              <button
                className="btn btn-light"
                onClick={()=>removeBinaryItem(idx, itemIdx)}
                disabled={binaryData.items.length <= 1}
                title="Xóa phát biểu"
              >
                −
              </button>
            </div>
          ))}
          <button className="btn" onClick={()=>addBinaryItem(idx)}>Thêm phát biểu</button>
        </div>
      )}

      {qObj.type === "dragdrop" && dragData && (
        <div className="options-box dragdrop-box">
          <div className="drag-columns">
            <div className="drag-section">
              <div className="opts-title">Ngân hàng đáp án</div>
              {dragData.bank.map((opt, optIdx) => (
                <div key={opt.id || optIdx} className="drag-bank-row">
                  <div className="opt-id">{opt.id}</div>
                  <input
                    value={opt.text}
                    placeholder={`Đáp án ${opt.id}`}
                    onChange={(e)=>updateDragBankOption(idx, optIdx, e.target.value)}
                  />
                  <button
                    className="btn btn-light"
                    onClick={()=>removeDragBankOption(idx, optIdx)}
                    disabled={dragData.bank.length <= 1}
                    title="Xóa đáp án"
                  >
                    −
                  </button>
                </div>
              ))}
              <button className="btn" onClick={()=>addDragBankOption(idx)}>Thêm đáp án</button>
            </div>

            <div className="drag-section">
              <div className="opts-title">Ô kéo thả</div>
              {dragData.targets.map((target, targetIdx) => (
                <div key={target.id || targetIdx} className="drag-target-row">
                  <input
                    value={target.label}
                    placeholder={`Nhãn ô ${targetIdx + 1}`}
                    onChange={(e)=>updateDragTarget(idx, targetIdx, { label: e.target.value })}
                  />
                  <select
                    value={dragData.correctMapping[target.id] || ""}
                    onChange={(e)=>updateDragTargetMapping(idx, target.id, e.target.value)}
                  >
                    <option value="">-- Chưa chọn --</option>
                    {dragData.bank.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.text || opt.id}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-light"
                    onClick={()=>removeDragTarget(idx, targetIdx)}
                    disabled={dragData.targets.length <= 1}
                    title="Xóa ô"
                  >
                    −
                  </button>
                </div>
              ))}
              <button className="btn" onClick={()=>addDragTarget(idx)}>Thêm ô mới</button>
            </div>
          </div>
        </div>
      )}

      {qObj.type === "coordinate" && (
        <CoordinateEditor 
          qObj={qObj}
          idx={idx}
          updateQuestion={updateQuestion}
          localPreviews={localPreviews}
          setLocalPreviews={setLocalPreviews}
        />
      )}
    </div>
  );
});

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
      settings: { immediateFeedback: false, shuffleQuestions: true },
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
                updateQuestion(idx, { type: newType });
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
      const url = json.url.startsWith('/') ? `${API_URL}${json.url}` : json.url;
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

  const toPlainMapping = (mapping) => {
    if (!mapping) return {};
    if (mapping instanceof Map) {
      return Object.fromEntries(mapping.entries());
    }
    if (typeof mapping === "object") {
      return { ...mapping };
    }
    return {};
  };

  const normalizeBinaryQuestion = (question = {}) => {
    const columns = Array.isArray(question.columns) && question.columns.length === 2
      ? [...question.columns]
      : ["Có", "Không"];

    const items = Array.isArray(question.items) && question.items.length
      ? question.items.map((item, idx) => ({
          id: item.id || `item${idx + 1}`,
          text: item.text || "",
          correctColumn: columns.includes(item.correctColumn) ? item.correctColumn : columns[0]
        }))
      : [{ id: "item1", text: "", correctColumn: columns[0] }];

    return { columns, items };
  };

  const normalizeDragQuestion = (question = {}) => {
    const bank = Array.isArray(question.bank) && question.bank.length
      ? question.bank.map((opt, idx) => ({ id: opt.id || `opt${idx + 1}`, text: opt.text || "" }))
      : [{ id: "opt1", text: "Đáp án 1" }];

    const targets = Array.isArray(question.targets) && question.targets.length
      ? question.targets.map((target, idx) => ({ id: target.id || `target${idx + 1}`, label: target.label || `Ô ${idx + 1}` }))
      : [{ id: "target1", label: "Ô 1" }];

    const mapping = toPlainMapping(question.correctMapping);
    targets.forEach((target) => {
      if (!mapping[target.id]) {
        mapping[target.id] = bank[0]?.id || "";
      }
    });

    return { bank, targets, correctMapping: mapping };
  };

  const updateBinaryColumn = (qIdx, colIdx, value) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeBinaryQuestion(question);
    const columns = [...normalized.columns];
    const prevLabel = columns[colIdx] || "";
    columns[colIdx] = value;
    question.columns = columns;
    question.items = normalized.items.map((item) =>
      item.correctColumn === prevLabel ? { ...item, correctColumn: value } : { ...item }
    );
    copy.questions[qIdx] = question;
    return copy;
  });

  const addBinaryItem = (qIdx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeBinaryQuestion(question);
    const nextId = `item${normalized.items.length + 1}`;
    const defaultColumn = normalized.columns[0];
    question.items = [...normalized.items, { id: nextId, text: "", correctColumn: defaultColumn }];
    question.columns = normalized.columns;
    copy.questions[qIdx] = question;
    return copy;
  });

  const updateBinaryItem = (qIdx, itemIdx, patch) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeBinaryQuestion(question);
    const items = [...normalized.items];
    items[itemIdx] = { ...items[itemIdx], ...patch };
    question.items = items;
    question.columns = normalized.columns;
    copy.questions[qIdx] = question;
    return copy;
  });

  const removeBinaryItem = (qIdx, itemIdx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeBinaryQuestion(question);
    const items = [...normalized.items];
    if (items.length <= 1) return copy;
    items.splice(itemIdx, 1);
    question.items = items;
    question.columns = normalized.columns;
    copy.questions[qIdx] = question;
    return copy;
  });

  const addDragBankOption = (qIdx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeDragQuestion(question);
    const bank = [...normalized.bank, { id: `opt${normalized.bank.length + 1}`, text: "" }];
    question.bank = bank;
    question.targets = normalized.targets;
    question.correctMapping = normalized.correctMapping;
    copy.questions[qIdx] = question;
    return copy;
  });

  const updateDragBankOption = (qIdx, optIdx, text) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeDragQuestion(question);
    const bank = [...normalized.bank];
    bank[optIdx] = { ...bank[optIdx], text };
    question.bank = bank;
    question.targets = normalized.targets;
    question.correctMapping = normalized.correctMapping;
    copy.questions[qIdx] = question;
    return copy;
  });

  const removeDragBankOption = (qIdx, optIdx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeDragQuestion(question);
    const bank = [...normalized.bank];
    if (bank.length <= 1) return copy;
    const [removed] = bank.splice(optIdx, 1);
    const mapping = { ...normalized.correctMapping };
    Object.keys(mapping).forEach((targetId) => {
      if (mapping[targetId] === removed.id) {
        mapping[targetId] = bank[0]?.id || "";
      }
    });
    question.bank = bank;
    question.targets = normalized.targets;
    question.correctMapping = mapping;
    copy.questions[qIdx] = question;
    return copy;
  });

  const addDragTarget = (qIdx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeDragQuestion(question);
    const nextId = `target${normalized.targets.length + 1}`;
    const targets = [...normalized.targets, { id: nextId, label: `Ô ${normalized.targets.length + 1}` }];
    const mapping = { ...normalized.correctMapping, [nextId]: normalized.bank[0]?.id || "" };
    question.targets = targets;
    question.bank = normalized.bank;
    question.correctMapping = mapping;
    copy.questions[qIdx] = question;
    return copy;
  });

  const updateDragTarget = (qIdx, targetIdx, patch) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeDragQuestion(question);
    const targets = [...normalized.targets];
    targets[targetIdx] = { ...targets[targetIdx], ...patch };
    question.targets = targets;
    question.bank = normalized.bank;
    question.correctMapping = normalized.correctMapping;
    copy.questions[qIdx] = question;
    return copy;
  });

  const updateDragTargetMapping = (qIdx, targetId, optionId) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeDragQuestion(question);
    const mapping = { ...normalized.correctMapping, [targetId]: optionId };
    question.correctMapping = mapping;
    question.bank = normalized.bank;
    question.targets = normalized.targets;
    copy.questions[qIdx] = question;
    return copy;
  });

  const removeDragTarget = (qIdx, targetIdx) => setQuiz((q) => {
    const copy = { ...(q || {}) };
    copy.questions = copy.questions ? [...copy.questions] : [];
    const question = { ...(copy.questions[qIdx] || {}) };
    const normalized = normalizeDragQuestion(question);
    if (normalized.targets.length <= 1) return copy;
    const targets = [...normalized.targets];
    const [removed] = targets.splice(targetIdx, 1);
    const mapping = { ...normalized.correctMapping };
    delete mapping[removed.id];
    question.targets = targets;
    question.bank = normalized.bank;
    question.correctMapping = mapping;
    copy.questions[qIdx] = question;
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
              <label style={{marginLeft: '12px'}}>Random câu hỏi</label>
              <input type="checkbox" checked={quiz.settings?.shuffleQuestions !== false} onChange={(e)=>updateMeta({settings: {...(quiz.settings||{}), shuffleQuestions: e.target.checked}})} />
            </div>

            <div className="meta-row">
              <label>Thời gian làm bài (phút)</label>
              <select 
                value={quiz.settings?.timeLimit || ""} 
                onChange={(e)=>updateMeta({settings: {...(quiz.settings||{}), timeLimit: e.target.value ? parseInt(e.target.value) : null}})}
                style={{padding: '8px 12px', borderRadius: '8px', border: '1px solid #e6eef6'}}
              >
                <option value="">Không giới hạn</option>
                <option value="5">5 phút</option>
                <option value="10">10 phút</option>
                <option value="15">15 phút</option>
                <option value="20">20 phút</option>
                <option value="30">30 phút</option>
                <option value="45">45 phút</option>
                <option value="60">60 phút</option>
              </select>
            </div>

            <div className="questions-list">
              <div className="questions-head">
                <h3>Câu hỏi</h3>
                <button className="btn" onClick={addQuestion}>Thêm câu</button>
                <button className="btn btn-light" onClick={()=>setShowRaw(s=>!s)}>{showRaw ? 'Ẩn Raw' : 'Hiện Raw'}</button>
              </div>

              {quiz.questions && quiz.questions.map((qObj, i) => (
                <div key={qObj.id || i} className="question-item">
                  <QuestionEditor 
                    qObj={qObj} 
                    idx={i}
                    updateQuestion={updateQuestion}
                    removeQuestion={removeQuestion}
                    addOption={addOption}
                    updateOptionText={updateOptionText}
                    updateOptionTextAndPreview={updateOptionTextAndPreview}
                    uploadImageFile={uploadImageFile}
                    removeOption={removeOption}
                    normalizeBinaryQuestion={normalizeBinaryQuestion}
                    normalizeDragQuestion={normalizeDragQuestion}
                    updateBinaryColumn={updateBinaryColumn}
                    addBinaryItem={addBinaryItem}
                    updateBinaryItem={updateBinaryItem}
                    removeBinaryItem={removeBinaryItem}
                    addDragBankOption={addDragBankOption}
                    updateDragBankOption={updateDragBankOption}
                    removeDragBankOption={removeDragBankOption}
                    addDragTarget={addDragTarget}
                    updateDragTarget={updateDragTarget}
                    updateDragTargetMapping={updateDragTargetMapping}
                    removeDragTarget={removeDragTarget}
                    localPreviews={localPreviews}
                    setLocalPreviews={setLocalPreviews}
                  />
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
