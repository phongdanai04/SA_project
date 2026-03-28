import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from './api';
import { getStoredUser } from './auth';
import './Booking.css';

function Booking({ currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.selectedRoom;
  const user = currentUser || getStoredUser();

  const [form, setForm] = useState({
    customerName: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    checkInDate: '',
    checkOutDate: '',
    checkInTime: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="booking-container">
        <h2>กรุณาเข้าสู่ระบบก่อนจองห้องพัก</h2>
        <Link to="/login" className="inline-link">ไปหน้าเข้าสู่ระบบ</Link>
      </div>
    );
  }

  if (user.role === 'admin') {
    return (
      <div className="booking-container">
        <h2>บัญชีผู้ดูแลไม่สามารถสร้างการจองลูกค้าโดยตรงจากหน้านี้</h2>
        <Link to="/admin" className="inline-link">ไปหน้าผู้ดูแล</Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="booking-container">
        <h2>ยังไม่มีรายการห้องที่เลือก</h2>
        <p>กรุณาเลือกห้องพักจากหน้ารายการห้องพักก่อน</p>
        <Link to="/rooms" className="inline-link">กลับไปเลือกห้องพัก</Link>
      </div>
    );
  }

  const totalNights = form.checkInDate && form.checkOutDate
    ? Math.max(0, Math.ceil((new Date(form.checkOutDate) - new Date(form.checkInDate)) / (1000 * 60 * 60 * 24)))
    : 0;

  const totalPrice = totalNights * Number(room.price || 0);

  const handleConfirmBooking = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/bookings', {
        userId: user._id,
        roomId: room._id,
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        checkInTime: form.checkInTime || null,
        checkOutTime: null,
      });

      alert(`จองห้อง ${room.roomNumber} เรียบร้อยแล้ว`);
      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถสร้างรายการจองได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-container">
      <h2>จองเข้าพักรีสอร์ท</h2>

      <div className="booking-card">
        <h3>รายละเอียดห้องพัก</h3>
        <p><strong>เลขห้อง:</strong> {room.roomNumber}</p>
        <p><strong>ประเภท:</strong> {room.type}</p>
        <p><strong>รายละเอียด:</strong> {room.description}</p>
        <p><strong>ราคาต่อคืน:</strong> {Number(room.price || 0).toLocaleString()} บาท</p>
        <p><strong>สถานะ:</strong> {room.status}</p>
      </div>

      <form onSubmit={handleConfirmBooking} className="booking-form">
        <h3>ข้อมูลผู้เข้าพัก</h3>

        <input
          type="text"
          placeholder="ชื่อผู้เข้าพัก"
          required
          value={form.customerName}
          onChange={(event) => setForm({ ...form, customerName: event.target.value })}
        />
        <input
          type="email"
          placeholder="อีเมล"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <input
          type="tel"
          placeholder="เบอร์โทร"
          required
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        <label className="booking-label">
          วันเข้าพัก
          <input
            type="date"
            required
            value={form.checkInDate}
            onChange={(event) => setForm({ ...form, checkInDate: event.target.value })}
          />
        </label>
        <label className="booking-label">
          วันออก
          <input
            type="date"
            required
            value={form.checkOutDate}
            onChange={(event) => setForm({ ...form, checkOutDate: event.target.value })}
          />
        </label>
        <label className="booking-label">
          เวลาเข้าพักโดยประมาณ
          <input
            type="time"
            value={form.checkInTime}
            onChange={(event) => setForm({ ...form, checkInTime: event.target.value })}
          />
        </label>

        <div className="booking-summary">
          <p>จำนวนคืน: {totalNights}</p>
          <p>ราคารวม: {totalPrice.toLocaleString()} บาท</p>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="confirm-btn" disabled={submitting}>
          {submitting ? 'กำลังยืนยันการจอง...' : 'ยืนยันการจอง'}
        </button>
      </form>
    </div>
  );
}

export default Booking;
