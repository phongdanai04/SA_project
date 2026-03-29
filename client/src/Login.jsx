import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { storeUser } from './auth';
import './Login.css';

const initialRegisterForm = {
  username: '',
  email: '',
  password: '',
  phone: '',
};

function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/auth/login', credentials);
      const user = response.data.user;

      storeUser(user);
      onLogin(user);
      navigate(user.role === 'admin' ? '/admin' : '/rooms');
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/api/auth/register', registerForm);
      setSuccess('สมัครสมาชิกสำเร็จแล้ว กรุณาเข้าสู่ระบบ');
      setRegisterForm(initialRegisterForm);
      setMode('login');
      setCredentials({
        identifier: registerForm.email,
        password: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถสมัครสมาชิกได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="auth-switch">
          <button
            type="button"
            className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => {
              setMode('register');
              setError('');
              setSuccess('');
            }}
          >
            สมัครสมาชิก
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
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
            {success ? <p className="login-success">{success}</p> : null}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <h2>สมัครสมาชิกใหม่</h2>
            <p className="login-hint">สร้างบัญชีผู้ใช้งานเพื่อจองห้องพักและติดตามสถานะการชำระเงิน</p>

            <input
              type="text"
              placeholder="ชื่อผู้ใช้"
              required
              value={registerForm.username}
              onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })}
            />
            <input
              type="email"
              placeholder="อีเมล"
              required
              value={registerForm.email}
              onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
            />
            <input
              type="password"
              placeholder="รหัสผ่าน"
              required
              value={registerForm.password}
              onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
            />
            <input
              type="tel"
              placeholder="เบอร์โทร"
              required
              value={registerForm.phone}
              onChange={(event) => setRegisterForm({ ...registerForm, phone: event.target.value })}
            />

            {error ? <p className="login-error">{error}</p> : null}
            {success ? <p className="login-success">{success}</p> : null}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
