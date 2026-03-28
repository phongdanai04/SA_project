import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import './Home.css';

function Home({ currentUser }) {
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    occupied: 0,
  });

  useEffect(() => {
    const fetchRoomStats = async () => {
      try {
        const response = await api.get('/api/rooms');
        const rooms = response.data;

        setStats({
          total: rooms.length,
          available: rooms.filter((room) => room.status === 'available').length,
          booked: rooms.filter((room) => room.status === 'booked').length,
          occupied: rooms.filter((room) => room.status === 'occupied').length,
        });
      } catch (err) {
        console.error('Error fetching room stats:', err);
      }
    };

    fetchRoomStats();
  }, []);

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>ระบบจัดการรีสอร์ท</h1>
        <p>ดูรายละเอียดห้องพัก จองตามวันเข้าพักจริง และแยกการใช้งานระหว่างลูกค้าทั่วไปกับผู้ดูแลระบบ</p>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">ห้องทั้งหมด</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">พร้อมจอง</span>
            <strong>{stats.available}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">จองแล้ว</span>
            <strong>{stats.booked}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">เข้าพักอยู่</span>
            <strong>{stats.occupied}</strong>
          </div>
        </div>

        <div className="nav-buttons">
          <Link to="/rooms" className="btn-primary">ดูห้องพักทั้งหมด</Link>
          {currentUser?.role === 'admin' ? (
            <Link to="/admin" className="btn-secondary">ไปหน้าผู้ดูแล</Link>
          ) : currentUser ? (
            <Link to="/my-bookings" className="btn-secondary">ดูการจองของฉัน</Link>
          ) : (
            <Link to="/login" className="btn-secondary">เข้าสู่ระบบ</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
