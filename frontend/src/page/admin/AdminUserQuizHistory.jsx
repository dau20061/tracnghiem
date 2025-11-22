import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';

import { useParams, useNavigate } from 'react-router-dom';
import './AdminUserQuizHistory.css';

const AdminUserQuizHistory = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [retryHistory, setRetryHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [activeTab, setActiveTab] = useState('original'); // 'original' | 'retries'
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedRetries, setSelectedRetries] = useState([]);
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

  // Fetch lịch sử làm lại của user (tất cả retry history)
  const fetchRetryHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Gọi API để lấy tất cả retry history của user này
      const response = await fetch(`${API_URL}/api/quiz-results/admin/${userId}/retries`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải lịch sử làm lại');
      }

      const data = await response.json();
      setRetryHistory(data.retries || []);
    } catch (err) {
      setError(err.message);
      setRetryHistory([]);
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
    setSelectedRetries([]);

    try {
      // Lấy chi tiết bài làm
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

        // Lấy retry history của bài này
        try {
          const retryResponse = await fetch(`${API_URL}/api/quiz-results/retry-history/${resultId}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            setSelectedRetries(retryData.retryHistory || []);
          }
        } catch (retryErr) {
          console.error('Error loading retry history:', retryErr);
          // Không throw error, chỉ log
        }
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
    setSelectedRetries([]);
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

  const getOptionLabel = (question, optionId) => {
    if (!question || !optionId) return optionId || '—';
    const found = question.options?.find((opt) => opt.id === optionId);
    return found ? `${found.id}. ${found.text}` : optionId;
  };

  const formatBinaryColumn = (question, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return 'Không có';
    return ids
      .map((id) => question.items?.find((item) => item.id === id)?.text || id)
      .join(', ');
  };

  const formatDragOption = (question, optionId) => {
    if (!question || !optionId) return 'Chưa chọn';
    const found = question.bank?.find((item) => item.id === optionId);
    return found ? found.text : optionId;
  };

  const isImageQuestion = (question) => ['image_single', 'image_grid'].includes(question?.type);

  const renderImageChoice = (question, optionId, emptyLabel = 'Chưa trả lời') => {
    if (!optionId) {
      return <span className="muted">{emptyLabel}</span>;
    }

    const option = question?.options?.find((opt) => opt.id === optionId);
    if (!option) {
      return <span>{optionId}</span>;
    }

    return (
      <div className="image-answer-chip" key={optionId}>
        <div className="image-thumb">
          <img
            src={option.text}
            alt={`Đáp án ${option.id}`}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
              event.currentTarget.closest('.image-thumb')?.classList.add('image-thumb--error');
            }}
          />
        </div>
        <div className="image-meta">
          <span>{option.caption || `Đáp án ${option.id}`}</span>
        </div>
      </div>
    );
  };

  const renderImageAnswerValue = (question, value, emptyLabel = 'Chưa trả lời') => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return <span className="muted">{emptyLabel}</span>;
    }

    if (Array.isArray(value)) {
      return (
        <div className="image-answer-group">
          {value.map((id) => renderImageChoice(question, id, emptyLabel))}
        </div>
      );
    }

    return renderImageChoice(question, value, emptyLabel);
  };

  const renderAnswerSnippet = (value, question = null) => {
    // Nếu không có metadata câu hỏi, xử lý generic
    if (!question) {
      if (value === null || typeof value === 'undefined' || value === '') {
        return <span className="muted">Không có dữ liệu</span>;
      }
      // Array generic
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <span className="muted">Không có dữ liệu</span>;
        }
        return (
          <ul className="answer-list">
            {value.map((item, idx) => (
              <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
            ))}
          </ul>
        );
      }
      // Object generic
      if (typeof value === 'object') {
        return (
          <div className="answer-object">
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="object-entry">
                <strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </div>
            ))}
          </div>
        );
      }
      // Primitive
      return <span className="answer-snippet">{String(value)}</span>;
    }

    // Có metadata câu hỏi
    switch (question.type) {
      case 'single':
      case 'image_single':
      case 'image_grid':
        if (!value) return <span className="muted">Chưa trả lời</span>;
        return isImageQuestion(question)
          ? renderImageAnswerValue(question, value)
          : <span className="answer-snippet">{getOptionLabel(question, value)}</span>;

      case 'multi':
        if (!Array.isArray(value) || value.length === 0) {
          return <span className="muted">Chưa trả lời</span>;
        }
        return (
          <ul className="answer-list">
            {value.map((id) => (
              <li key={id}>{getOptionLabel(question, id)}</li>
            ))}
          </ul>
        );

      case 'binary':
        if (!value) return <span className="muted">Chưa trả lời</span>;
        const binaryLeft = value.left || [];
        const binaryRight = value.right || [];
        return (
          <div className="binary-answer-block">
            <div>
              <strong>{question.columns?.[0] || 'Cột 1'}:</strong>{' '}
              {Array.isArray(binaryLeft) && binaryLeft.length > 0
                ? formatBinaryColumn(question, binaryLeft)
                : <span className="muted">Không có</span>}
            </div>
            <div>
              <strong>{question.columns?.[1] || 'Cột 2'}:</strong>{' '}
              {Array.isArray(binaryRight) && binaryRight.length > 0
                ? formatBinaryColumn(question, binaryRight)
                : <span className="muted">Không có</span>}
            </div>
          </div>
        );

      case 'dragdrop':
        if (!value || !question.targets?.length) {
          return <span className="muted">Chưa trả lời</span>;
        }
        return (
          <div className="dragdrop-answer-block">
            {question.targets.map((target) => (
              <div key={target.id} className="drag-answer-item">
                <strong>{target.label}:</strong>{' '}
                {value[target.id]
                  ? formatDragOption(question, value[target.id])
                  : <span className="muted">Chưa chọn</span>}
              </div>
            ))}
          </div>
        );

      default:
        if (value === null || typeof value === 'undefined' || value === '') {
          return <span className="muted">Không có dữ liệu</span>;
        }
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return <span className="muted">Không có dữ liệu</span>;
          }
          return (
            <ul className="answer-list">
              {value.map((item, idx) => (
                <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
              ))}
            </ul>
          );
        }
        if (typeof value === 'object') {
          return (
            <div className="answer-object">
              {Object.entries(value).map(([key, val]) => (
                <div key={key} className="object-entry">
                  <strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </div>
              ))}
            </div>
          );
        }
        return <span className="answer-snippet">{String(value)}</span>;
    }
  };

  const getCorrectReference = (question) => {
    if (!question) return null;
    if (question.type === 'binary') {
      const leftIds = question.items?.filter((item) => item.correctColumn === question.columns?.[0]).map((item) => item.id) || [];
      const rightIds = question.items?.filter((item) => item.correctColumn === question.columns?.[1]).map((item) => item.id) || [];
      return { left: leftIds, right: rightIds };
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
    if (activeTab === 'original') {
      fetchUserHistory(1);
    } else {
      fetchRetryHistory();
    }
  }, [userId, activeTab]);

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

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        padding: '0 0 10px 0'
      }}>
        <button
          onClick={() => setActiveTab('original')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'original' ? '3px solid #667eea' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'original' ? 'bold' : 'normal',
            color: activeTab === 'original' ? '#667eea' : '#6b7280'
          }}
        >
          🆕 Bài làm mới ({history.length})
        </button>
        <button
          onClick={() => setActiveTab('retries')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'retries' ? '3px solid #667eea' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'retries' ? 'bold' : 'normal',
            color: activeTab === 'retries' ? '#667eea' : '#6b7280'
          }}
        >
          🔄 Lịch sử làm lại ({retryHistory.length})
        </button>
      </div>

      {/* Danh sách lịch sử - Original */}
      {activeTab === 'original' && history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>Chưa có lịch sử làm bài</h3>
          <p>User này chưa làm bài quiz nào.</p>
        </div>
      ) : (
        <>
          <div className="history-list">
            <h2>📋 Lịch sử bài làm mới ({pagination?.totalResults || 0} bài)</h2>
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

      {/* Danh sách lịch sử làm lại */}
      {activeTab === 'retries' && (
        retryHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔄</div>
            <h3>Chưa có lịch sử làm lại</h3>
            <p>User này chưa làm lại bài nào.</p>
          </div>
        ) : (
          <div className="history-list">
            <h2>🔄 Lịch sử làm lại ({retryHistory.length} lần)</h2>
            <div className="history-table">
              <div className="table-header">
                <div className="col col-quiz">Bài quiz</div>
                <div className="col col-score">Điểm số</div>
                <div className="col col-time">Thời gian</div>
                <div className="col col-date">Ngày làm</div>
                <div className="col col-actions">Lần retry</div>
              </div>
              
              {retryHistory.map((retry) => (
                <div key={retry.id} className="table-row" style={{ borderLeft: '4px solid #06b6d4' }}>
                  <div className="col col-quiz">
                    <div className="quiz-info">
                      <div className="quiz-title">
                        {retry.quizTitle}
                        <span style={{ 
                          marginLeft: '8px',
                          padding: '2px 8px',
                          background: '#06b6d4',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          Lần {retry.retryNumber}
                        </span>
                      </div>
                      <div className="quiz-id">
                        ID: {retry.quizId} | Bài gốc: {retry.originalResultId?.toString().slice(-6)}
                      </div>
                      {retry.originalPercentage !== undefined && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          So với bài gốc: 
                          <span style={{ 
                            marginLeft: '5px',
                            color: retry.percentage >= retry.originalPercentage ? '#059669' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {retry.percentage >= retry.originalPercentage ? '📈' : '📉'}
                            {' '}{retry.percentage >= retry.originalPercentage ? '+' : ''}{retry.percentage - retry.originalPercentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="col col-score">
                    <div className="score-info">
                      <div className="score-main">
                        {retry.score}/{retry.totalQuestions}
                        <span className="percentage">{retry.percentage}%</span>
                      </div>
                      <div className={`grade ${getGradeClass(retry.grade)}`}>
                        {retry.grade}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col col-time">
                    <div className="time-info">
                      {formatTime(retry.totalTimeSpent)}
                    </div>
                  </div>
                  
                  <div className="col col-date">
                    <div className="date-info">
                      {formatDate(retry.completedAt)}
                    </div>
                  </div>
                  
                  <div className="col col-actions">
                    <button
                      onClick={() => openResultDetail(retry.originalResultId || retry.quizResultId)}
                      className="btn btn-view"
                      title="Xem bài gốc"
                    >
                      👁️ Bài gốc
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
      {detailModalOpen && (
        <div className="admin-modal" role="dialog" aria-modal="true" onClick={closeDetailModal}>
          <div className="admin-modal__content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="admin-modal__close" 
              onClick={closeDetailModal} 
              aria-label="Đóng"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #e5e7eb',
                background: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ef4444';
                e.target.style.color = 'white';
                e.target.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.color = '#6b7280';
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              ×
            </button>
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

                {/* Retry History Section */}
                {selectedRetries.length > 0 && (
                  <div style={{
                    background: '#f0f9ff',
                    border: '2px solid #06b6d4',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 15px 0', 
                      color: '#0e7490',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      🔄 Lịch sử làm lại ({selectedRetries.length} lần)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedRetries.map((retry, index) => (
                        <div 
                          key={retry.id || index}
                          style={{
                            background: 'white',
                            border: '1px solid #e0f2fe',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{
                              background: '#06b6d4',
                              color: 'white',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              marginRight: '10px'
                            }}>
                              Lần {retry.retryNumber}
                            </span>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>
                              {formatDate(retry.completedAt)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div>
                              <span style={{ 
                                fontSize: '18px', 
                                fontWeight: 'bold',
                                color: retry.percentage >= 80 ? '#10b981' : retry.percentage >= 60 ? '#f59e0b' : '#ef4444'
                              }}>
                                {retry.score}/{retry.totalQuestions}
                              </span>
                              <span style={{ 
                                marginLeft: '8px',
                                fontSize: '16px',
                                color: '#6b7280'
                              }}>
                                ({retry.percentage}%)
                              </span>
                            </div>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: retry.percentage >= 90 ? '#10b981' : 
                                         retry.percentage >= 80 ? '#3b82f6' : 
                                         retry.percentage >= 70 ? '#f59e0b' : 
                                         retry.percentage >= 60 ? '#ef4444' : '#6b7280',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '16px'
                            }}>
                              {retry.grade}
                            </div>
                            <span style={{ 
                              fontSize: '14px', 
                              color: '#6b7280',
                              minWidth: '60px'
                            }}>
                              ⏱️ {retry.formattedTime}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                            {renderAnswerSnippet(answer.userAnswer, answer.question)}
                          </div>
                          <div>
                            <div className="answer-title">Đáp án đúng</div>
                            {renderAnswerSnippet(getCorrectReference(answer.question), answer.question)}
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