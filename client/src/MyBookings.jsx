import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { getStoredUser } from './auth';
import './MyBookings.css';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId) => {
    const confirmed = window.confirm('หากกดยกเลิกเราจะไม่คืนเงินมัดจำ คุณต้องการยกเลิกการจองใช่หรือไม่');

    if (!confirmed) {
      return;
    }

    try {
      await api.patch(`/api/bookings/${bookingId}/cancel`);
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถยกเลิกการจองได้');
    }
  };

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
            <p>ยอดเต็ม: {Number(booking.finalPrice || 0).toLocaleString()} บาท</p>
            <p>มัดจำ: {Number(booking.depositAmount || 0).toLocaleString()} บาท</p>
            <p>สถานะการชำระเงิน: {booking.paymentStatus}</p>
            {booking.paymentSlip ? (
              <a href={`http://localhost:5000${booking.paymentSlip}`} target="_blank" rel="noreferrer" className="slip-link">
                ดูสลิปที่อัปโหลด
              </a>
            ) : null}
            <div className="booking-card-footer">
              <span className={`booking-pill booking-pill-${booking.status}`}>
                {booking.status}
              </span>
              {['pending-confirmation', 'booked'].includes(booking.status) ? (
                <button type="button" className="cancel-booking-btn" onClick={() => handleCancelBooking(booking._id)}>
                  ยกเลิกการจอง
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default MyBookings;
