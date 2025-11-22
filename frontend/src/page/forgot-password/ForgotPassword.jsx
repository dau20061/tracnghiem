import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: nhập email, 2: nhập OTP + password mới
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Đổi mật khẩu thành công! Đang chuyển đến trang đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h1>🔐 Quên mật khẩu</h1>
          <p>
            {step === 1 
              ? 'Nhập email của bạn để nhận mã OTP' 
              : 'Nhập mã OTP và mật khẩu mới'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            ❌ {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            ✅ {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/login')}
            >
              ← Quay lại đăng nhập
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="otp">Mã OTP</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập 6 số"
                maxLength={6}
                required
                disabled={loading}
              />
              <small>Mã OTP đã được gửi đến email: {email}</small>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>

            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setStep(1);
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
                setMessage('');
              }}
            >
              ← Quay lại
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
