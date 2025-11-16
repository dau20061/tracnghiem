import React, { useState, useEffect, useCallback } from 'react';import { API_URL } from '../../config/api';

import { useNavigate } from 'react-router-dom';
import './AdminRevenueStats.css';

const AdminRevenueStats = () => {
  const navigate = useNavigate();
  
  const [overview, setOverview] = useState(null);
  const [revenueByPackage, setRevenueByPackage] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageUsers, setPackageUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, packages, timeline
  const [timelinePeriod, setTimelinePeriod] = useState('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_URL}/api/revenue-stats/overview', {
        headers: {
          'Content-Type': 'application/json'
          // Add admin key if needed
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải dữ liệu');
      }

      const data = await response.json();
      setOverview(data.overview);
      setRevenueByPackage(data.revenueByPackage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch timeline data
  const fetchTimeline = useCallback(async (period) => {
    try {
      const response = await fetch(`${API_URL}/api/revenue-stats/timeline?period=${period}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải timeline');
      }

      const data = await response.json();
      setTimeline(data.timeline);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Fetch users by package
  const fetchPackageUsers = useCallback(async (packageType, page = 1) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/revenue-stats/users/${packageType}?page=${page}&limit=10`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tải danh sách user');
      }

      const data = await response.json();
      setPackageUsers(data.users);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle package click
  const handlePackageClick = (packageType) => {
    setSelectedPackage(packageType);
    setActiveTab('packages');
    fetchPackageUsers(packageType, 1);
  };

  // Get package name
  const getPackageName = (type) => {
    switch (type) {
      case 'day': return 'Gói 1 ngày';
      case 'month': return 'Gói 1 tháng'; 
      case 'year': return 'Gói 1 năm';
      default: return 'Không xác định';
    }
  };

  // Get package color
  const getPackageColor = (type) => {
    switch (type) {
      case 'day': return '#10b981';
      case 'month': return '#3b82f6';
      case 'year': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchTimeline(timelinePeriod);
    }
  }, [activeTab, timelinePeriod, fetchTimeline]);

  if (loading && activeTab === 'overview') {
    return (
      <div className="revenue-stats">
        <div className="loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="revenue-stats">
      <div className="revenue-header">
        <div className="header-content">
          <div>
            <h1>💰 Thống kê doanh thu</h1>
            <p>Báo cáo chi tiết về doanh thu từ các gói nâng cấp</p>
          </div>
          <button onClick={() => navigate('/admin/users')} className="back-btn">
            ← Quay lại
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Tổng quan
        </button>
        <button 
          className={`tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('packages')}
        >
          📦 Theo gói
        </button>
        <button 
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📈 Theo thời gian
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="notice error">{error}</div>}

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="overview-content">
          {/* Summary Stats */}
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(overview.totalRevenue)}</div>
                <div className="stat-label">Tổng doanh thu</div>
              </div>
            </div>
            
            <div className="stat-card users">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{overview.totalUsers}</div>
                <div className="stat-label">Khách hàng trả phí</div>
              </div>
            </div>
            
            <div className="stat-card transactions">
              <div className="stat-icon">🧾</div>
              <div className="stat-content">
                <div className="stat-value">{overview.totalTransactions}</div>
                <div className="stat-label">Giao dịch thành công</div>
              </div>
            </div>
            
            <div className="stat-card average">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{formatCurrency(overview.averageRevenuePerUser)}</div>
                <div className="stat-label">TB/Khách hàng</div>
              </div>
            </div>
          </div>

          {/* Revenue by Package */}
          <div className="packages-overview">
            <h2>📦 Doanh thu theo gói</h2>
            <div className="packages-grid">
              {Object.entries(revenueByPackage).map(([packageType, data]) => (
                <div 
                  key={packageType} 
                  className="package-card"
                  style={{ borderLeftColor: getPackageColor(packageType) }}
                  onClick={() => handlePackageClick(packageType)}
                >
                  <div className="package-header">
                    <h3>{getPackageName(packageType)}</h3>
                    <div className="package-price">{formatCurrency(data.price)}</div>
                  </div>
                  
                  <div className="package-stats">
                    <div className="package-stat">
                      <span className="stat-label">Doanh thu:</span>
                      <span className="stat-value">{formatCurrency(data.revenue || 0)}</span>
                    </div>
                    
                    <div className="package-stat">
                      <span className="stat-label">Số lần mua:</span>
                      <span className="stat-value">{data.count || 0}</span>
                    </div>
                    
                    <div className="package-stat">
                      <span className="stat-label">Người dùng:</span>
                      <span className="stat-value">{data.users?.length || 0}</span>
                    </div>
                    
                    {data.transactionCount && (
                      <div className="package-stat">
                        <span className="stat-label">Giao dịch:</span>
                        <span className="stat-value">{data.transactionCount}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="package-footer">
                    <button className="view-details-btn">Xem chi tiết →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Package Details Tab */}
      {activeTab === 'packages' && selectedPackage && (
        <div className="packages-content">
          <div className="package-header-detail">
            <h2>📦 {getPackageName(selectedPackage)} - Chi tiết khách hàng</h2>
            <div className="package-selector">
              <select 
                value={selectedPackage} 
                onChange={(e) => handlePackageClick(e.target.value)}
              >
                <option value="day">Gói 1 ngày</option>
                <option value="month">Gói 1 tháng</option>
                <option value="year">Gói 1 năm</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Đang tải danh sách...</p>
            </div>
          ) : (
            <>
              <div className="users-table">
                <div className="table-header">
                  <div className="col col-user">Khách hàng</div>
                  <div className="col col-purchases">Số lần mua</div>
                  <div className="col col-revenue">Doanh thu</div>
                  <div className="col col-status">Trạng thái</div>
                  <div className="col col-expires">Hết hạn</div>
                </div>

                {packageUsers.map((user) => (
                  <div key={user.id} className="table-row">
                    <div className="col col-user">
                      <div className="user-info">
                        <div className="username">{user.username}</div>
                        <div className="email">{user.email}</div>
                        <div className="user-id">ID: {user.id}</div>
                      </div>
                    </div>
                    
                    <div className="col col-purchases">
                      <div className="purchase-count">{user.purchaseCount}</div>
                    </div>
                    
                    <div className="col col-revenue">
                      <div className="revenue">{formatCurrency(user.revenue)}</div>
                    </div>
                    
                    <div className="col col-status">
                      <div className={`status ${user.isActive ? 'active' : 'expired'}`}>
                        {user.isActive ? 'Còn hạn' : 'Hết hạn'}
                      </div>
                    </div>
                    
                    <div className="col col-expires">
                      <div className="expires-date">
                        {user.membershipExpiresAt ? formatDate(user.membershipExpiresAt) : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => fetchPackageUsers(selectedPackage, currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="btn"
                  >
                    ← Trước
                  </button>
                  
                  <span className="pagination-info">
                    Trang {pagination.currentPage} / {pagination.totalPages} 
                    ({pagination.totalUsers} khách hàng)
                  </span>
                  
                  <button
                    onClick={() => fetchPackageUsers(selectedPackage, currentPage + 1)}
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
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="timeline-content">
          <div className="timeline-header">
            <h2>📈 Doanh thu theo thời gian</h2>
            <div className="timeline-controls">
              <select 
                value={timelinePeriod} 
                onChange={(e) => setTimelinePeriod(e.target.value)}
              >
                <option value="day">Theo ngày (30 ngày)</option>
                <option value="month">Theo tháng (12 tháng)</option>
                <option value="year">Theo năm (5 năm)</option>
              </select>
            </div>
          </div>

          <div className="timeline-chart">
            {timeline.length === 0 ? (
              <div className="empty-timeline">
                <p>Không có dữ liệu trong khoảng thời gian này</p>
              </div>
            ) : (
              <div className="timeline-list">
                {timeline.map((item, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-period">{item.period}</div>
                    <div className="timeline-stats">
                      <div className="timeline-stat">
                        <span className="stat-label">Doanh thu:</span>
                        <span className="stat-value revenue">
                          {formatCurrency(item.totalRevenue)}
                        </span>
                      </div>
                      <div className="timeline-stat">
                        <span className="stat-label">Giao dịch:</span>
                        <span className="stat-value transactions">
                          {item.totalTransactions}
                        </span>
                      </div>
                    </div>
                    
                    {/* Breakdown by package */}
                    {Object.keys(item.breakdown).length > 0 && (
                      <div className="timeline-breakdown">
                        {Object.entries(item.breakdown).map(([pkg, data]) => (
                          <div 
                            key={pkg} 
                            className="breakdown-item"
                            style={{ borderLeftColor: getPackageColor(pkg) }}
                          >
                            <span className="pkg-name">{getPackageName(pkg)}</span>
                            <span className="pkg-stats">
                              {data.count} × {formatCurrency(data.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRevenueStats;