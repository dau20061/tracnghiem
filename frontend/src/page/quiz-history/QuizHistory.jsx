import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';

import { useNavigate } from 'react-router-dom';
import './QuizHistory.css';
const QuizHistory = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(0);
  const navigate = useNavigate();

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

  const renderImageChoice = (question, optionId, emptyLabel = '—') => {
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

  const renderImageAnswerValue = (question, value, emptyLabel = '—') => {
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

  const renderAnswerValue = (question, value, emptyLabel = '—') => {
    // Trường hợp không có question metadata
    if (!question) {
      if (value === null || typeof value === 'undefined' || value === '') {
        return <span className="muted">{emptyLabel}</span>;
      }
      // Nếu là array, hiển thị dạng danh sách
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <span className="muted">{emptyLabel}</span>;
        }
        return (
          <ul className="answer-list">
            {value.map((item, idx) => (
              <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
            ))}
          </ul>
        );
      }
      // Nếu là object, hiển thị các key-value
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
      // Các kiểu dữ liệu đơn giản
      return <span>{String(value)}</span>;
    }

    switch (question.type) {
      case 'single':
      case 'image_single':
      case 'image_grid':
        if (!value) return <span className="muted">{emptyLabel}</span>;
        return isImageQuestion(question)
          ? renderImageAnswerValue(question, value, emptyLabel)
          : <span>{getOptionLabel(question, value)}</span>;
      case 'multi':
        if (!Array.isArray(value) || value.length === 0) {
          return <span className="muted">{emptyLabel}</span>;
        }
        return (
          <ul className="answer-list">
            {value.map((id) => (
              <li key={id}>{getOptionLabel(question, id)}</li>
            ))}
          </ul>
        );
      case 'binary':
        if (!value) return <span className="muted">{emptyLabel}</span>;
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
          return <span className="muted">{emptyLabel}</span>;
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
          return <span className="muted">{emptyLabel}</span>;
        }
        // Array fallback
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return <span className="muted">{emptyLabel}</span>;
          }
          return (
            <ul className="answer-list">
              {value.map((item, idx) => (
                <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
              ))}
            </ul>
          );
        }
        // Object fallback
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
        // Primitive values
        return <span>{String(value)}</span>;
    }
  };

  const getCorrectValue = (question) => {
    if (!question) return null;
    switch (question.type) {
      case 'binary': {
        const leftIds = question.items?.filter((item) => item.correctColumn === question.columns?.[0]).map((item) => item.id) || [];
        const rightIds = question.items?.filter((item) => item.correctColumn === question.columns?.[1]).map((item) => item.id) || [];
        return { left: leftIds, right: rightIds };
      }
      case 'dragdrop':
        return question.correctMapping || null;
      default:
        return question.correct ?? null;
    }
  };

  const renderUserAnswer = (answer) => renderAnswerValue(answer.question, answer.userAnswer, 'Chưa trả lời');
  const renderCorrectAnswer = (question) => renderAnswerValue(question, getCorrectValue(question), 'Không có đáp án tham chiếu');

  // Lấy lịch sử làm bài
  const fetchHistory = async (page = 1) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/quiz-results/history?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.results);
      setPagination(data.pagination);
      setRemainingAttempts(data.remainingAttempts || 0);
    } catch (err) {
      setError('Không thể tải lịch sử làm bài');
      console.error('Fetch history error:', err);
    }
  };

  // Lấy thống kê
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/quiz-results/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchHistory(currentPage),
        fetchStats()
      ]);
      setLoading(false);
    };

    loadData();
  }, [currentPage]);

  // Xử lý phân trang
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
  };

  // Format ngày giờ
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Lấy class cho grade
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

  // Xem chi tiết kết quả
  const viewDetail = async (resultId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setSelectedResult(null);

    try {
      const response = await fetch(`${API_URL}/api/quiz-results/result/${resultId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải chi tiết kết quả');
      }

      const data = await response.json();
      setSelectedResult(data);
    } catch (err) {
      console.error('Fetch result detail error:', err);
      setDetailError(err.message || 'Không thể tải chi tiết kết quả');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedResult(null);
    setDetailError('');
  };

  // Retry quiz handler
  const handleRetry = (result) => {
    if (!result.canRetryNow) {
      setError('Bài này không thể làm lại hoặc đã hết số lần làm lại');
      return;
    }

    // Navigate to quiz page with retry info
    navigate(`/quiz/${result.quizId}`, {
      state: {
        isRetry: true,
        originalAttemptId: result.id
      }
    });
  };

  if (loading) {
    return (
      <div className="quiz-history-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-history-container">
      <div className="quiz-history-header">
        <div className="header-content">
          <h1>📊 Lịch sử làm bài</h1>
          <button 
            className="home-btn"
            onClick={() => navigate('/')}
            title="Về trang chủ"
          >
            🏠 Trang chủ
          </button>
        </div>
        <p>Theo dõi tiến độ học tập và kết quả của bạn</p>
        <div className="attempts-info">
          <span className="attempts-badge">
            🎯 Lượt làm bài còn lại: <strong>{remainingAttempts}</strong>
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 Lịch sử bài thi
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📈 Thống kê
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchHistory(currentPage)}>Thử lại</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'history' ? (
        <div className="history-content">
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>Chưa có lịch sử làm bài</h3>
              <p>Hãy bắt đầu làm bài để xem kết quả tại đây!</p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/practice')}
              >
                Bắt đầu luyện tập
              </button>
            </div>
          ) : (
            <>
              <div className="history-list">
                {history.map((result) => (
                  <div key={result.id} className="history-item">
                    <div className="quiz-info">
                      <h3 className="quiz-title">{result.quizTitle}</h3>
                      <div className="quiz-meta">
                        <span className="date">📅 {formatDate(result.completedAt)}</span>
                        <span className="time">⏱️ {result.formattedTime}</span>
                      </div>
                    </div>
                    
                    <div className="result-info">
                      <div className="score-section">
                        <div className="score-number">
                          {result.score}/{result.totalQuestions}
                        </div>
                        <div className="percentage">
                          {result.percentage}%
                        </div>
                      </div>
                      
                      <div className={`grade ${getGradeClass(result.grade)}`}>
                        {result.grade}
                      </div>
                    </div>

                    <div className="actions">
                      <button 
                        className="btn-detail"
                        onClick={() => viewDetail(result.id)}
                      >
                        Chi tiết
                      </button>
                      {result.canRetryNow && (
                        <button 
                          className="btn-retry"
                          onClick={() => handleRetry(result)}
                          title={`Còn ${result.maxRetries - result.retriesUsed} lần làm lại`}
                        >
                          🔄 Làm lại ({result.maxRetries - result.retriesUsed})
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="page-btn"
                  >
                    ← Trước
                  </button>
                  
                  <div className="page-numbers">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let page;
                      if (pagination.totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= pagination.totalPages - 2) {
                        page = pagination.totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`page-btn ${currentPage === page ? 'active' : ''}`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="page-btn"
                  >
                    Sau →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="stats-content">
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.totalAttempts}</div>
                  <div className="stat-label">Tổng số lần thi</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.averageScore}%</div>
                  <div className="stat-label">Điểm trung bình</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.bestScore}%</div>
                  <div className="stat-label">Điểm cao nhất</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.completedQuizzes}</div>
                  <div className="stat-label">Bài đã hoàn thành</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⏰</div>
                <div className="stat-info">
                  <div className="stat-number">
                    {Math.floor(stats.totalTimeSpent / 3600)}h {Math.floor((stats.totalTimeSpent % 3600) / 60)}m
                  </div>
                  <div className="stat-label">Tổng thời gian học</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Results */}
          {stats?.recentResults && stats.recentResults.length > 0 && (
            <div className="recent-results">
              <h3>🕐 Kết quả gần đây</h3>
              <div className="recent-list">
                {stats.recentResults.map((result, index) => (
                  <div key={index} className="recent-item">
                    <span className="recent-title">{result.quizTitle}</span>
                    <span className="recent-score">{result.percentage}%</span>
                    <span className="recent-date">{formatDate(result.completedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Stats */}
          {stats?.quizStats && stats.quizStats.length > 0 && (
            <div className="quiz-stats">
              <h3>📋 Thống kê theo bài thi</h3>
              <div className="quiz-stats-list">
                {stats.quizStats.map((quiz, index) => (
                  <div key={index} className="quiz-stat-item">
                    <div className="quiz-stat-info">
                      <h4>{quiz.quizTitle}</h4>
                      <div className="quiz-stat-meta">
                        <span>Số lần: {quiz.attempts}</span>
                        <span>Điểm cao nhất: {quiz.bestScore}%</span>
                        <span>Điểm TB: {quiz.avgScore}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {detailModalOpen && (
        <div className="quiz-detail-modal" role="dialog" aria-modal="true">
          <div className="detail-dialog">
            <button className="modal-close" onClick={closeDetailModal} aria-label="Đóng">
              ×
            </button>

            {detailLoading && (
              <div className="modal-loading">
                <div className="spinner" />
                <p>Đang tải chi tiết...</p>
              </div>
            )}

            {!detailLoading && detailError && (
              <div className="modal-error">{detailError}</div>
            )}

            {!detailLoading && !detailError && selectedResult && (
              <>
                <div className="detail-header">
                  <h2>{selectedResult.quizMeta?.title || selectedResult.quizTitle}</h2>
                  <p>Mã bài: {selectedResult.quizId}</p>
                </div>

                <div className="detail-summary-grid">
                  <div className="summary-card">
                    <span className="summary-label">Điểm</span>
                    <strong>{selectedResult.score}/{selectedResult.totalQuestions}</strong>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Tỷ lệ đúng</span>
                    <strong>{selectedResult.percentage}% • {selectedResult.grade}</strong>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Thời gian</span>
                    <strong>{selectedResult.formattedTime}</strong>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Hoàn thành</span>
                    <strong>{formatDate(selectedResult.completedAt)}</strong>
                  </div>
                </div>

                <div className="question-detail-list">
                  {selectedResult.answers?.map((answer, index) => (
                    <div
                      key={`${answer.questionId}-${index}`}
                      className={`question-detail-card ${answer.isCorrect ? 'correct' : 'incorrect'}`}
                    >
                      <div className="question-header">
                        <div>
                          <span className="question-index">Câu {index + 1}</span>
                        </div>
                        <span className={`answer-status ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                          {answer.isCorrect ? 'Đúng' : 'Sai'}
                        </span>
                      </div>
                      <p className="question-prompt">{answer.question?.prompt || 'Câu hỏi không còn khả dụng'}</p>
                      <div className="question-meta-row">
                        <span>Loại: {answer.question?.type || 'N/A'}</span>
                        <span>Thời gian: {answer.formattedTime}</span>
                      </div>
                      <div className="answer-block">
                        <div>
                          <div className="answer-title">Trả lời của bạn</div>
                          {renderUserAnswer(answer)}
                        </div>
                        <div>
                          <div className="answer-title">Đáp án đúng</div>
                          {renderCorrectAnswer(answer.question)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizHistory;