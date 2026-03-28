import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { getStoredUser } from './auth';
import './MyBookings.css';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      const user = getStoredUser();

      if (!user) {
        setError('กรุณาเข้าสู่ระบบก่อนดูประวัติการจอง');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/api/bookings', {
          params: {
            userId: user._id,
            role: user.role,
          },
        });
        setBookings(response.data);
      } catch (err) {
        setError('ไม่สามารถโหลดประวัติการจองได้');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h2>ประวัติการจอง</h2>
        <Link to="/rooms" className="bookings-link">กลับไปดูห้องพัก</Link>
      </div>

      {loading ? <p>กำลังโหลดข้อมูลการจอง...</p> : null}
      {error ? <p className="bookings-error">{error}</p> : null}

      {!loading && !error && bookings.length === 0 ? (
        <div className="booking-empty">
          <p>ยังไม่มีประวัติการจองในระบบ</p>
        </div>
      ) : null}

      <div className="booking-history-grid">
        {bookings.map((booking) => (
          <article key={booking._id} className="booking-history-card">
            <h3>ห้อง {booking.roomNumber}</h3>
            <p>{booking.roomType}</p>
            <p>ผู้เข้าพัก: {booking.customerName}</p>
            <p>วันที่เข้าพัก: {booking.checkInDate}</p>
            <p>วันที่ออก: {booking.checkOutDate}</p>
            <p>เวลาเช็กอิน: {booking.checkInTime || '-'}</p>
            <p>ยอดรวม: {Number(booking.finalPrice || 0).toLocaleString()} บาท</p>
            <span className={`booking-pill booking-pill-${booking.status}`}>
              {booking.status}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

export default MyBookings;
