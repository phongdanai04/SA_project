import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { storeUser } from './auth';
import './Login.css';

function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', credentials);
      const user = response.data.user;

      storeUser(user);
      onLogin(user);

      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/rooms');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h2>เข้าสู่ระบบรีสอร์ท</h2>
        <p className="login-hint">กรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่านให้ตรงกับข้อมูลในระบบ</p>

        <input
          type="text"
          placeholder="ชื่อผู้ใช้ หรือ อีเมล"
          required
          value={credentials.identifier}
          onChange={(event) => setCredentials({ ...credentials, identifier: event.target.value })}
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          required
          value={credentials.password}
          onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
        />

        {error ? <p className="login-error">{error}</p> : null}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <div className="login-note">
          <span>ข้อมูลที่ใช้ในระบบหลังล็อกอิน: ชื่อ, เมล, เบอร์ และ role ของผู้ใช้</span>
        </div>
      </form>
    </div>
  );
}

export default Login;
