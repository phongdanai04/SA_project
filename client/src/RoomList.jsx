import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import './RoomList.css';

const statusMeta = {
  available: { label: 'พร้อมจอง', className: 'status-available' },
  booked: { label: 'จองแล้ว', className: 'status-booked' },
  occupied: { label: 'เข้าพักอยู่', className: 'status-occupied' },
};

function RoomList({ currentUser }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get('/api/rooms');
        setRooms(response.data);
      } catch (err) {
        setError('ไม่สามารถดึงข้อมูลห้องพักได้');
        console.error('Error fetching rooms:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="room-container">
        <h2>กำลังโหลดข้อมูลห้องพัก...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-container">
        <h2>{error}</h2>
        <Link to="/" className="back-btn">กลับหน้าแรก</Link>
      </div>
    );
  }

  return (
    <div className="room-container">
      <div className="room-heading">
        <h2>ห้องพักรีสอร์ท</h2>
        <p>แต่ละห้องมีรายละเอียด วันที่เข้าพัก และสถานะจากฐานข้อมูลล่าสุด</p>
      </div>

      <div className="room-grid">
        {rooms.map((room) => {
          const isAvailable = room.status === 'available';
          const meta = statusMeta[room.status] || statusMeta.booked;

          return (
            <div key={room._id} className="room-card">
              <div className="room-card-top">
                <h3>ห้อง {room.roomNumber}</h3>
                <span className={`status-badge ${meta.className}`}>{meta.label}</span>
              </div>

              <p className="room-type">{room.type}</p>
              <p className="room-description">{room.description || 'ยังไม่มีรายละเอียดห้องพัก'}</p>
              <p className="room-meta">รูปภาพในระบบ: {room.images?.length || 0} ไฟล์</p>
              <div className="room-price">{Number(room.price || 0).toLocaleString()} บาท / คืน</div>

              {currentUser?.role === 'admin' ? (
                <Link to="/admin" className="book-btn admin-link">จัดการห้องนี้</Link>
              ) : (
                <Link
                  to="/booking"
                  state={{ selectedRoom: room }}
                  className={`book-btn ${!isAvailable ? 'book-btn-disabled' : ''}`}
                  onClick={(event) => {
                    if (!isAvailable) {
                      event.preventDefault();
                    }
                  }}
                >
                  {isAvailable ? 'เลือกวันเข้าพัก' : meta.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <Link to="/" className="back-btn">กลับหน้าแรก</Link>
    </div>
  );
}

export default RoomList;
