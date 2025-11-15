import React, { useState, useEffect } from 'react';
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
  const navigate = useNavigate();

  // Lấy lịch sử làm bài
  const fetchHistory = async (page = 1) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/quiz-results/history?page=${page}&limit=10`, {
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

      const response = await fetch('http://localhost:4000/api/quiz-results/stats', {
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
  const viewDetail = (resultId) => {
    // Có thể tạo modal hoặc trang chi tiết riêng
    console.log('View detail for result:', resultId);
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
    </div>
  );
};

export default QuizHistory;