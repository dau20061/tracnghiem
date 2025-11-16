import React, { useState, useEffect } from 'react';import { API_URL } from '../../config/api';

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
    </div>
  );
};

export default AdminUserQuizHistory;