import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import axios from 'axios';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const code = new URLSearchParams(location.search).get('code');
      if (!code) {
        message.error('授权失败！');
        navigate('/login');
        return;
      }

      try {
        const response = await axios.post('http://localhost:8000/auth/google/callback', { code });
        localStorage.setItem('token', response.data.access_token);
        message.success('登录成功！');
        navigate('/dashboard');
      } catch (error) {
        message.error('登录失败！');
        navigate('/login');
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh'
    }}>
      <h2>正在处理登录...</h2>
    </div>
  );
};

export default AuthCallback; 