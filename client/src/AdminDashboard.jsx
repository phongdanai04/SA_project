import { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

function AdminDashboard() {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', type: '', price: '', status: 'ว่าง' });

  // 1. ดึงข้อมูล
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = () => {
    axios.get('http://localhost:5000/api/rooms').then(res => setRooms(res.data));
  };

  // 2. เพิ่มห้อง (Create)
  const addRoom = () => {
    axios.post('http://localhost:5000/api/rooms', newRoom).then(() => {
      fetchRooms();
      setNewRoom({ roomNumber: '', type: '', price: '', status: 'ว่าง' });
    });
  };

  // 3. ลบห้อง (Delete)
  const deleteRoom = (id) => {
    axios.delete(`http://localhost:5000/api/rooms/${id}`).then(() => fetchRooms());
  };

  // 4. แก้ไขสถานะ (Update)
  const updateStatus = (id, status) => {
    axios.put(`http://localhost:5000/api/rooms/${id}`, { status }).then(() => fetchRooms());
  };

  return (
    <div className="admin-container">
      <h2>จัดการข้อมูลห้องพัก</h2>
      
      {/* ส่วนเพิ่มห้อง */}
      <div className="admin-form">
        <input placeholder="เลขห้อง" onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})} />
        <input placeholder="ประเภท" onChange={e => setNewRoom({...newRoom, type: e.target.value})} />
        <input placeholder="ราคา" onChange={e => setNewRoom({...newRoom, price: e.target.value})} />
        <button onClick={addRoom}>เพิ่มห้องพัก</button>
      </div>

      <table className="room-table">
        <thead><tr><th>เลขห้อง</th><th>ประเภท</th><th>ราคา</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
        <tbody>
          {rooms.map(room => (
            <tr key={room.id}>
              <td>{room.roomNumber}</td>
              <td>{room.type}</td>
              <td>{room.price}</td>
              <td>{room.status}</td>
              <td>
                <button onClick={() => updateStatus(room.id, room.status === 'ว่าง' ? 'ไม่ว่าง' : 'ว่าง')}>สลับสถานะ</button>
                <button className="del-btn" onClick={() => deleteRoom(room.id)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default AdminDashboard;