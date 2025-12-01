import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api';
import './verifyEmail.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('Đang xác thực tài khoản...');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link xác thực không hợp lệ');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login', { state: { verified: true } });
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Xác thực thất bại');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        {status === 'verifying' && (
          <>
            <div className="spinner"></div>
            <h1>Đang xác thực...</h1>
            <p>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h1>Xác thực thành công!</h1>
            <p>{message}</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/login')}
            >
              Đăng nhập ngay
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-icon">✕</div>
            <h1>Xác thực thất bại</h1>
            <p>{message}</p>
            <button 
              className="btn-secondary"
              onClick={() => navigate('/login')}
            >
              Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
}
