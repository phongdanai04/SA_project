import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './RoomList.css';

function RoomList() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/rooms')
      .then(res => setRooms(res.data))
      .catch(err => console.error("Error fetching rooms:", err));
  }, []);

  return (
    <div className="room-container">
      <h2>รายการห้องพักของเรา</h2>
      <div className="room-grid">
        {rooms.map(room => (
          <div key={room.id} className="room-card">
            <h3>ห้อง {room.roomNumber}</h3>
            <p>ประเภท: {room.type}</p>
            <div className={`status-badge ${room.status === 'ว่าง' ? 'status-available' : 'status-occupied'}`}>
                {room.status === 'ว่าง' ? 'พร้อมเข้าพัก' : 'ไม่ว่าง'}
            </div>
            <div className="room-price">{room.price.toLocaleString()} บาท / คืน</div>

            <Link 
                to="/booking" 
                state={{ selectedRoom: room }} 
                className="book-btn"
            >
            จองห้องพักนี้
            </Link>

          </div>
        ))}
      </div>
      <Link to="/" className="back-btn">กลับหน้าแรก</Link>
    </div>
  );
}

export default RoomList;