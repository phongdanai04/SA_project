import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './Booking.css';

function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  // รับข้อมูลห้องที่ส่งมาจากหน้า RoomList
  const room = location.state?.selectedRoom; 
  const [customerName, setCustomerName] = useState('');

  // 1. ตรวจสอบการ Login ทันทีที่เข้าหน้านี้
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      alert("กรุณาเข้าสู่ระบบก่อนทำการจองห้องพักครับ");
      navigate('/login');
    }
  }, [navigate]);

  // 2. ป้องกันกรณี User พิมพ์ URL เข้ามาเองโดยไม่ได้เลือกห้องจากหน้า List
  if (!room) {
    return (
      <div className="booking-container">
        <h2>ยังไม่มีรายการจอง</h2>
        <p>กรุณาเลือกห้องพักจากหน้า "รายการห้องพัก" ก่อนครับ</p>
        <Link to="/rooms">กลับไปหน้าเลือกห้องพัก</Link>
      </div>
    );
  }

  const handleConfirmBooking = (e) => {
    e.preventDefault();
    alert(`ยืนยันการจองห้อง ${room.roomNumber} สำหรับคุณ ${customerName} เรียบร้อยแล้ว!`);
    navigate('/rooms');
  };

  return (
    <div className="booking-container">
      <h2>สรุปการจองของคุณ</h2>
      
      {/* ส่วนแสดงข้อมูลที่หยิบใส่ตะกร้ามา */}
      <div className="booking-card">
        <h3>รายละเอียดห้องพัก</h3>
        <p><strong>หมายเลขห้อง:</strong> {room.roomNumber}</p>
        <p><strong>ประเภท:</strong> {room.type}</p>
        <p><strong>ราคาต่อคืน:</strong> {room.price.toLocaleString()} บาท</p>
      </div>

      <form onSubmit={handleConfirmBooking} className="booking-form">
        <h3>ข้อมูลผู้จอง</h3>
        <input 
          type="text" 
          placeholder="ชื่อ-นามสกุล" 
          required 
          onChange={(e) => setCustomerName(e.target.value)} 
        />
        <button type="submit" className="confirm-btn">ยืนยันการจอง</button>
      </form>
    </div>
  );
}

export default Booking;