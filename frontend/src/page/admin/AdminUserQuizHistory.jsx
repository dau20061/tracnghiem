import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';

import { useParams, useNavigate } from 'react-router-dom';
import './AdminUserQuizHistory.css';

const AdminUserQuizHistory = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailSuccess, setDetailSuccess] = useState('');
  const [editableAnswers, setEditableAnswers] = useState([]);
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);

  // Fetch lịch sử làm bài của user
  const fetchUserHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_URL}/api/quiz-results/admin/${userId}?page=${page}&limit=10`, {
        headers: {
          'Content-Type': 'application/json'
          // Có thể cần thêm x-admin-key nếu cần
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải dữ liệu');
      }

      const data = await response.json();
      setUser(data.user);
      setHistory(data.results);
      setStats(data.stats);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Xóa một kết quả làm bài
  const deleteResult = async (resultId, quizTitle) => {
    if (!window.confirm(`Xóa kết quả bài "${quizTitle}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/quiz-results/admin/${resultId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể xóa');
      }

      setNotice('Đã xóa kết quả làm bài');
      fetchUserHistory(currentPage); // Reload trang hiện tại
    } catch (err) {
      setError(err.message);
    }
  };

  // Xóa toàn bộ lịch sử làm bài
  const deleteAllHistory = async () => {
    if (!window.confirm(`Xóa toàn bộ lịch sử làm bài của ${user?.username}? Hành động này không thể hoàn tác!`)) return;

    try {
      const response = await fetch(`${API_URL}/api/quiz-results/admin/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể xóa');
      }

      const data = await response.json();
      setNotice(data.message);
      setHistory([]);
      setStats({
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeSpent: 0
      });
      setPagination(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const openResultDetail = async (resultId) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailSuccess('');
    setEditingEnabled(false);
    setEditableAnswers([]);

    try {
      const response = await fetch(`${API_URL}/api/quiz-results/admin/result/${resultId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể tải chi tiết bài làm');
      }

      if (payload.result) {
        setSelectedResult(payload.result);
        setEditableAnswers(initializeEditableAnswers(payload.result.answers || []));
      } else {
        throw new Error('Dữ liệu kết quả không hợp lệ');
      }
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedResult(null);
    setEditableAnswers([]);
    setEditingEnabled(false);
    setDetailError('');
    setDetailSuccess('');
  };

  const toggleEditing = () => {
    if (!selectedResult) return;
    if (editingEnabled) {
      setEditableAnswers(initializeEditableAnswers(selectedResult.answers || []));
      setEditingEnabled(false);
      setDetailError('');
    } else {
      setEditingEnabled(true);
      setDetailSuccess('');
    }
  };

  const updateEditableAnswer = (index, field, value) => {
    setEditableAnswers((prev) => prev.map((answer, i) => (i === index ? { ...answer, [field]: value } : answer)));
  };

  const saveEditedAnswers = async () => {
    if (!selectedResult || !editableAnswers.length) return;
    setSavingDetail(true);
    setDetailError('');
    setDetailSuccess('');

    try {
      const payloadAnswers = editableAnswers.map((answer) => {
        let parsedAnswer = answer.userAnswerText;
        if (typeof parsedAnswer === 'string') {
          const trimmed = parsedAnswer.trim();
          if (trimmed.length) {
            try {
              parsedAnswer = JSON.parse(trimmed);
            } catch {
              parsedAnswer = parsedAnswer;
            }
          } else {
            parsedAnswer = '';
          }
        }

        return {
          questionId: answer.questionId,
          userAnswer: parsedAnswer,
          isCorrect: !!answer.isCorrect,
          timeSpent: Number(answer.timeSpent) >= 0 ? Number(answer.timeSpent) : 0
        };
      });

      const resultId = selectedResult.id || selectedResult._id;
      const response = await fetch(`${API_URL}/api/quiz-results/admin/result/${resultId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: payloadAnswers })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể lưu chỉnh sửa');
      }

      if (payload.result) {
        setSelectedResult(payload.result);
        setEditableAnswers(initializeEditableAnswers(payload.result.answers || []));
        setEditingEnabled(false);
        setDetailSuccess('Đã cập nhật kết quả làm bài.');
        await fetchUserHistory(currentPage);
      }
    } catch (err) {
      setDetailError(err.message || 'Có lỗi xảy ra khi lưu chỉnh sửa');
    } finally {
      setSavingDetail(false);
    }
  };

  // Format thời gian
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format ngày
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Màu grade
  const getGradeClass = (grade) => {
    switch (grade) {
      case 'A': return 'grade-a';
      case 'B': return 'grade-b';
      case 'C': return 'grade-c';
      case 'D': return 'grade-d';
      case 'F': return 'grade-f';
      default: return 'grade-f';
    }
  };

  const renderAnswerSnippet = (value) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return <span className="muted">Không có dữ liệu</span>;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <span className="answer-snippet">{String(value)}</span>;
    }
    return <pre className="answer-json">{JSON.stringify(value, null, 2)}</pre>;
  };

  const getCorrectReference = (question) => {
    if (!question) return null;
    if (question.type === 'binary') {
      const result = {};
      if (Array.isArray(question.columns)) {
        question.columns.forEach((column) => {
          result[column] = question.items?.filter((item) => item.correctColumn === column).map((item) => item.text) || [];
        });
        return result;
      }
      return question.items?.reduce((acc, item) => {
        const key = item.correctColumn || 'Đúng';
        acc[key] = acc[key] || [];
        acc[key].push(item.text);
        return acc;
      }, {}) || null;
    }
    if (question.type === 'dragdrop') {
      return question.correctMapping || null;
    }
    return question.correct ?? null;
  };

  const initializeEditableAnswers = (answers = []) => (
    answers.map((answer) => ({
      questionId: answer.questionId,
      userAnswerText:
        typeof answer.userAnswer === 'string'
          ? answer.userAnswer
          : JSON.stringify(answer.userAnswer ?? '', null, 2),
      isCorrect: answer.isCorrect,
      timeSpent: answer.timeSpent || 0
    }))
  );

  useEffect(() => {
    fetchUserHistory(1);
  }, [userId]);

  if (loading && !history.length) {
    return (
      <div className="admin-quiz-history">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-quiz-history">
      <div className="history-header">
        <div className="header-content">
          <div className="user-info">
            <button onClick={() => navigate('/admin/users')} className="back-btn">
              ← Quay lại
            </button>
            <div className="user-details">
              <h1>📊 Lịch sử làm bài</h1>
              {user && (
                <div className="user-meta">
                  <span className="username">{user.username}</span>
                  <span className="email">{user.email}</span>
                  <span className="user-id">ID: {user.id}</span>
                </div>
              )}
            </div>
          </div>
          
          {history.length > 0 && (
            <div className="header-actions">
              <button 
                onClick={deleteAllHistory}
                className="btn btn-danger"
                title="Xóa toàn bộ lịch sử"
              >
                🗑️ Xóa tất cả
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thông báo */}
      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice success">{notice}</div>}

      {/* Thống kê tổng quan */}
      {stats && stats.totalAttempts > 0 && (
        <div className="stats-overview">
          <h2>📈 Thống kê tổng quan</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.totalAttempts}</div>
              <div className="stat-label">Lần làm bài</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.averageScore.toFixed(1)}%</div>
              <div className="stat-label">Điểm trung bình</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.bestScore.toFixed(1)}%</div>
              <div className="stat-label">Điểm cao nhất</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatTime(stats.totalTimeSpent)}</div>
              <div className="stat-label">Tổng thời gian</div>
            </div>
          </div>
        </div>
      )}

      {/* Danh sách lịch sử */}
      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>Chưa có lịch sử làm bài</h3>
          <p>User này chưa làm bài quiz nào.</p>
        </div>
      ) : (
        <>
          <div className="history-list">
            <h2>📋 Lịch sử chi tiết ({pagination?.totalResults || 0} bài)</h2>
            <div className="history-table">
              <div className="table-header">
                <div className="col col-quiz">Bài quiz</div>
                <div className="col col-score">Điểm số</div>
                <div className="col col-time">Thời gian</div>
                <div className="col col-date">Ngày làm</div>
                <div className="col col-actions">Thao tác</div>
              </div>
              
              {history.map((result) => (
                <div key={result.id} className="table-row">
                  <div className="col col-quiz">
                    <div className="quiz-info">
                      <div className="quiz-title">{result.quizTitle}</div>
                      <div className="quiz-id">ID: {result.quizId}</div>
                    </div>
                  </div>
                  
                  <div className="col col-score">
                    <div className="score-info">
                      <div className="score-main">
                        {result.score}/{result.totalQuestions}
                        <span className="percentage">{result.percentage}%</span>
                      </div>
                      <div className={`grade ${getGradeClass(result.grade)}`}>
                        {result.grade}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col col-time">
                    <div className="time-info">
                      {formatTime(result.timeSpent)}
                    </div>
                  </div>
                  
                  <div className="col col-date">
                    <div className="date-info">
                      {formatDate(result.completedAt)}
                    </div>
                  </div>
                  
                  <div className="col col-actions">
                    <button
                      onClick={() => openResultDetail(result.id)}
                      className="btn btn-view"
                      title="Xem chi tiết"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => deleteResult(result.id, result.quizTitle)}
                      className="btn btn-delete"
                      title="Xóa kết quả này"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => fetchUserHistory(currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="btn"
              >
                ← Trước
              </button>
              
              <span className="pagination-info">
                Trang {pagination.currentPage} / {pagination.totalPages}
              </span>
              
              <button
                onClick={() => fetchUserHistory(currentPage + 1)}
                disabled={!pagination.hasNext}
                className="btn"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
      {detailModalOpen && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal__content">
            <button className="admin-modal__close" onClick={closeDetailModal} aria-label="Đóng">×</button>
            {detailLoading ? (
              <div className="modal-loading">
                <div className="spinner"></div>
                <p>Đang tải chi tiết bài làm...</p>
              </div>
            ) : selectedResult ? (
              <>
                <div className="modal-header">
                  <div>
                    <h2>{selectedResult.quizMeta?.title || selectedResult.quizTitle}</h2>
                    <p>Mã bài: {selectedResult.quizId}</p>
                    <p>Kết quả ID: {selectedResult.id}</p>
                    <p>Hoàn thành: {formatDate(selectedResult.completedAt)}</p>
                  </div>
                  <div className="modal-score">
                    <div className="modal-score__value">{selectedResult.percentage}%</div>
                    <div className={`grade ${getGradeClass(selectedResult.grade)}`}>{selectedResult.grade}</div>
                  </div>
                </div>

                <div className="modal-summary-grid">
                  <div>
                    <span className="summary-label">Điểm</span>
                    <strong>{selectedResult.score}/{selectedResult.totalQuestions}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Thời gian</span>
                    <strong>{selectedResult.formattedTime}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Trạng thái</span>
                    <strong>{selectedResult.status}</strong>
                  </div>
                </div>

                <div className="modal-toolbar">
                  <button
                    className="btn"
                    onClick={toggleEditing}
                    disabled={savingDetail || !selectedResult.answers?.length}
                  >
                    {editingEnabled ? 'Hủy chỉnh sửa' : 'Chỉnh sửa đáp án'}
                  </button>
                  {editingEnabled && (
                    <button
                      className="btn btn-primary"
                      onClick={saveEditedAnswers}
                      disabled={savingDetail}
                    >
                      {savingDetail ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  )}
                </div>

                {detailSuccess && <div className="notice success modal-notice">{detailSuccess}</div>}
                {detailError && <div className="notice error modal-notice">{detailError}</div>}

                {editingEnabled && (
                  <p className="edit-hint">
                    Nhập JSON hợp lệ cho đáp án phức tạp (ví dụ {'{'}"left": ["A"]{'}'}). Với đáp án đơn, nhập trực tiếp ký tự hoặc nội dung cần chỉnh sửa.
                  </p>
                )}

                <div className="admin-question-list">
                  {selectedResult.answers?.map((answer, index) => {
                    const editable = editableAnswers[index];
                    return (
                      <div key={`${answer.questionId}-${index}`} className="admin-question-card">
                        <div className="admin-question-head">
                          <div>
                            <span className="question-index">Câu {index + 1}</span>
                            <p className="question-prompt">{answer.question?.prompt || 'Câu hỏi không còn khả dụng'}</p>
                          </div>
                          <span className={`answer-status ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                            {answer.isCorrect ? 'Đúng' : 'Sai'}
                          </span>
                        </div>
                        <div className="admin-question-meta">
                          <span>Loại: {answer.question?.type || 'N/A'}</span>
                          <span>Thời gian: {answer.formattedTime}</span>
                        </div>
                        <div className="admin-answer-columns">
                          <div>
                            <div className="answer-title">Trả lời của user</div>
                            {renderAnswerSnippet(answer.userAnswer)}
                          </div>
                          <div>
                            <div className="answer-title">Đáp án đúng</div>
                            {renderAnswerSnippet(getCorrectReference(answer.question))}
                          </div>
                        </div>
                        {editingEnabled && editable && (
                          <div className="edit-panel">
                            <label>
                              <span>Đáp án (JSON hoặc văn bản)</span>
                              <textarea
                                rows={4}
                                value={editable.userAnswerText}
                                onChange={(e) => updateEditableAnswer(index, 'userAnswerText', e.target.value)}
                              />
                            </label>
                            <div className="edit-controls">
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={!!editable.isCorrect}
                                  onChange={(e) => updateEditableAnswer(index, 'isCorrect', e.target.checked)}
                                />
                                Đánh dấu đúng
                              </label>
                              <label>
                                Thời gian (giây)
                                <input
                                  type="number"
                                  min="0"
                                  value={editable.timeSpent}
                                  onChange={(e) => updateEditableAnswer(index, 'timeSpent', e.target.value)}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="notice error">{detailError || 'Không có dữ liệu để hiển thị'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserQuizHistory;