import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import './Home.css';

function Home({ currentUser }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    booked: 0,
    occupied: 0,
  });
  const [searchDates, setSearchDates] = useState({
    checkInDate: '',
    checkOutDate: '',
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

  const handleSearchAvailability = (event) => {
    event.preventDefault();

    navigate('/rooms', {
      state: {
        searchDates,
      },
    });
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>ระบบจัดการรีสอร์ท</h1>
        <p>เลือกวันเข้าพักเพื่อค้นหาห้องว่างได้ทันที พร้อมดูรายละเอียดห้องพักก่อนจองและชำระเงิน</p>

        <form className="availability-form" onSubmit={handleSearchAvailability}>
          <label>
            วันที่เข้าพัก
            <input
              type="date"
              required
              value={searchDates.checkInDate}
              onChange={(event) => setSearchDates({ ...searchDates, checkInDate: event.target.value })}
            />
          </label>
          <label>
            วันที่ออก
            <input
              type="date"
              required
              value={searchDates.checkOutDate}
              onChange={(event) => setSearchDates({ ...searchDates, checkOutDate: event.target.value })}
            />
          </label>
          <button type="submit" className="search-btn">ค้นหาห้องว่างตามวันที่</button>
        </form>


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
