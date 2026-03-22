import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // 1. บันทึกสถานะว่า Login แล้ว
    localStorage.setItem('isLoggedIn', 'true');
    
    // 2. เช็คเงื่อนไข Admin หรือ User
    if (credentials.username === 'admin') {
      alert('ยินดีต้อนรับท่านผู้ดูแลระบบ');
      navigate('/admin');
    } else {
      alert('ยินดีต้อนรับเข้าสู่ระบบจองห้องพักครับ');
      navigate('/rooms'); // เด้งไปหน้าเลือกห้องพักหลัง Login
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h2>เข้าสู่ระบบ</h2>
        <input 
          type="text" 
          placeholder="Username (admin หรือ guest)" 
          required 
          onChange={(e) => setCredentials({...credentials, username: e.target.value})} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          required 
        />
        <button type="submit" className="login-btn">Login</button>
      </form>
    </div>
  );
}

export default Login;