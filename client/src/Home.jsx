import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>ยินดีต้อนรับสู่โปรเจกต์รีสอร์ทของเรา</h1>
        <p>สัมผัสประสบการณ์การพักผ่อนที่เหนือระดับ จองห้องพักง่ายเพียงปลายนิ้ว</p>
        
        <div className="nav-buttons">
          <Link to="/rooms" className="btn-primary">ดูห้องพักว่าง</Link>
          <Link to="/login" className="btn-secondary">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}

export default Home;