// src/page/quiz/QuizComplete.jsx
import React, { useMemo, useEffect, useState } from "react";
import { API_URL } from '../../config/api';

import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./quiz.css";

export default function QuizComplete() {
  const { quizId } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false); // Thêm flag này
  const [resultInfo, setResultInfo] = useState(null); // Lưu thông tin từ backend (canRetry, retriesUsed, etc.)

  // Ưu tiên lấy từ state khi điều hướng, fallback sessionStorage nếu refresh
  const fromState = loc.state;
  const fromStore = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("quizResult");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const total = fromState?.total ?? fromStore?.total ?? 0;
  const done  = fromState?.done  ?? fromStore?.done  ?? 0; // Số câu đúng
  const answered = fromState?.answered ?? fromStore?.answered ?? done; // Số câu đã trả lời
  const answers = fromState?.answers ?? fromStore?.answers ?? [];
  const quizTitle = fromState?.quizTitle ?? fromStore?.quizTitle ?? `Quiz ${quizId}`;
  const startedAt = fromState?.startedAt ?? fromStore?.startedAt;
  const totalTimeSpent = fromState?.totalTimeSpent ?? fromStore?.totalTimeSpent ?? 0;
  const sessionId = fromState?.sessionId ?? fromStore?.sessionId;
  const mode = fromState?.mode ?? fromStore?.mode ?? 'training'; // Lấy mode để hiển thị tạm
  const hasTimeLimit = fromState?.hasTimeLimit ?? fromStore?.hasTimeLimit ?? false;

  // Tính toán điểm số dựa trên số câu đúng
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const grade = percentage >= 90 ? 'A' : 
                percentage >= 80 ? 'B' : 
                percentage >= 70 ? 'C' : 
                percentage >= 60 ? 'D' : 'F';

  // Lưu kết quả vào database
  const saveResult = async () => {
    const token = localStorage.getItem('token');
    
    // Multiple checks to prevent duplicate saves
    if (!token || saving || saved || saveAttempted) {
      console.log('🚫 Save blocked:', { token: !!token, saving, saved, saveAttempted });
      return;
    }

    // Kiểm tra đã save chưa từ sessionStorage với sessionId
    const sessionKey = `quiz-saved-${quizId}-${sessionId || 'default'}`;
    const alreadySaved = sessionStorage.getItem(sessionKey);
    if (alreadySaved) {
      console.log('🚫 Already saved in session');
      setSaved(true);
      return;
    }

    console.log('💾 Starting save process...');
    setSaveAttempted(true); // Set ngay khi bắt đầu attempt
    setSaving(true);
    
    try {
      // Format answers cho backend
      const formattedAnswers = answers.map(answer => ({
        questionId: answer.questionId || answer.id,
        userAnswer: answer.userAnswer || answer.answer,
        isCorrect: answer.isCorrect || false,
        timeSpent: answer.timeSpent || 0
      }));

      // Get retry info from state (fromState or fromStore)
      const isRetry = fromState?.isRetry || fromStore?.isRetry || false;
      const originalAttemptId = fromState?.originalAttemptId || fromStore?.originalAttemptId || null;
      
      // Get hasTimeLimit from state
      const hasTimeLimit = fromState?.hasTimeLimit || fromStore?.hasTimeLimit || false;

      const payload = {
        quizId: quizId,
        answers: formattedAnswers,
        totalTimeSpent: totalTimeSpent,
        startedAt: startedAt || new Date().toISOString(),
        sessionId: sessionId, // Thêm sessionId vào payload
        isRetry: isRetry, // Thêm isRetry flag
        originalAttemptId: originalAttemptId, // Thêm ID của lần làm gốc nếu có
        hasTimeLimit: hasTimeLimit // Thêm flag để backend biết quiz có giới hạn thời gian
      };

      const response = await fetch(`${API_URL}/api/quiz-results/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSaved(true);
        sessionStorage.setItem(sessionKey, 'true');
        const result = await response.json();
        console.log('✅ Quiz result saved successfully');
        
        // Lưu thông tin kết quả từ backend
        if (result.result) {
          setResultInfo(result.result);
        }
        
        // Show remaining attempts if provided
        if (result.remainingAttempts !== undefined) {
          console.log(`📊 Remaining attempts: ${result.remainingAttempts}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle no attempts error
        if (errorData.code === 'NO_ATTEMPTS') {
          alert('Bạn đã hết lượt làm bài. Vui lòng nâng cấp để tiếp tục.');
        }
        
        console.error('❌ Failed to save quiz result:', response.status, errorData);
        setSaveAttempted(false); // Reset nếu failed để có thể retry
      }
    } catch (error) {
      console.error('❌ Error saving quiz result:', error);
      setSaveAttempted(false); // Reset nếu error để có thể retry
    } finally {
      setSaving(false);
    }
  };

  // Tự động lưu kết quả khi component mount
  useEffect(() => {
    if (total > 0 && answers.length > 0 && !saved && !saving && !saveAttempted) {
      console.log('🔄 Auto-save triggered:', { total, answersLength: answers.length, saved, saving, saveAttempted });
      // Delay một chút để đảm bảo component đã render xong
      const timer = setTimeout(() => {
        saveResult();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [total, answers.length, saved, saving, saveAttempted]);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return '#10b981'; // green
      case 'B': return '#3b82f6'; // blue
      case 'C': return '#f59e0b'; // yellow
      case 'D': return '#ef4444'; // red
      case 'F': return '#6b7280'; // gray
      default: return '#6b7280';
    }
  };

  return (
    <div className="quiz-wrap">
      <div className="card" style={{ textAlign: "center", padding: 28 }}>
        <h1 style={{ marginTop: 0 }}>🎉 Hoàn thành bài kiểm tra</h1>
        <p style={{ color: "var(--muted)" }}>Mã bài: <strong>{quizId}</strong></p>
        
        {/* Kết quả chi tiết */}
        <div style={{ 
          background: '#f8fafc', 
          borderRadius: '12px', 
          padding: '20px', 
          margin: '20px 0',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 18, marginBottom: 15 }}>
            Bạn trả lời đúng <strong style={{ color: '#10b981' }}>{done}</strong>/<strong>{total}</strong> câu
          </div>
          
          {answered !== done && (
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 10 }}>
              Đã trả lời: <strong>{answered}</strong>/{total} câu • 
              Bỏ qua: <strong>{total - answered}</strong> câu
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '20px',
            marginBottom: 15
          }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: getGradeColor(grade) }}>
              {percentage}%
            </div>
            <div style={{ 
              width: 50, 
              height: 50, 
              borderRadius: '50%', 
              background: getGradeColor(grade),
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 'bold'
            }}>
              {grade}
            </div>
          </div>

          {totalTimeSpent > 0 && (
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              Thời gian: {Math.floor(totalTimeSpent / 60)}:{(totalTimeSpent % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Trạng thái lưu */}
        {saving && (
          <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 15 }}>
            💾 Đang lưu kết quả...
          </div>
        )}
        
        {saved && (
          <div style={{ color: '#10b981', fontSize: 14, marginBottom: 15 }}>
            ✅ Đã lưu kết quả vào lịch sử
          </div>
        )}

        <div className="actions" style={{ justifyContent: "center", marginTop: 20 }}>
          {/* Hiển thị nút/thông báo dựa trên kết quả từ backend hoặc mode */}
          {saved && resultInfo ? (
            // Đã có kết quả từ backend
            resultInfo.canRetry && (resultInfo.retriesUsed < resultInfo.maxRetries) ? (
              <>
                <button 
                  className="btn" 
                  onClick={() => nav(`/quiz/${quizId}`, { 
                    state: { 
                      isRetry: true, 
                      originalAttemptId: resultInfo.id 
                    } 
                  })}
                >
                  🔄 Làm lại ({resultInfo.retriesUsed}/{resultInfo.maxRetries})
                </button>
                <div style={{ 
                  fontSize: 13, 
                  color: '#10b981', 
                  marginBottom: 10,
                  textAlign: 'center',
                  width: '100%'
                }}>
                  ✨ Miễn phí làm lại - không trừ lượt
                </div>
              </>
            ) : resultInfo.canRetry === false ? (
              <div style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginBottom: 10,
                textAlign: 'center',
                width: '100%'
              }}>
                ⏱ Bài Testing không được làm lại
              </div>
            ) : null
          ) : (
            // Chưa có kết quả từ backend - hiển thị dựa trên mode
            mode === 'training' && !hasTimeLimit ? (
              <button 
                className="btn" 
                onClick={() => nav(`/quiz/${quizId}`)}
                disabled={!saved}
              >
                🔄 Làm lại bài
              </button>
            ) : (
              <div style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginBottom: 10,
                textAlign: 'center',
                width: '100%'
              }}>
                {saving ? '💾 Đang lưu...' : '⏱ Đang xử lý...'}
              </div>
            )
          )}
          
          <button 
            className="btn" 
            onClick={() => nav("/quiz-history")}
            style={{ background: '#667eea', color: 'white' }}
          >
            📊 Xem lịch sử
          </button>
          <button className="btn btn-primary" onClick={() => nav("/practice")} style={{ minWidth: 160 }}>
            ← Về IC3Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
