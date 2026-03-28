import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from './api';
import './AdminDashboard.css';

const initialRoomForm = {
  roomNumber: '',
  type: '',
  price: '',
  status: 'available',
  description: '',
};

const roomStatuses = ['available', 'booked', 'occupied'];

function AdminDashboard({ currentUser }) {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [newRoom, setNewRoom] = useState(initialRoomForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [roomsResponse, bookingsResponse] = await Promise.all([
        api.get('/api/rooms'),
        api.get('/api/bookings', {
          params: { role: 'admin' },
        }),
      ]);

      setRooms(roomsResponse.data);
      setBookings(bookingsResponse.data);
    } catch (err) {
      setError('โหลดข้อมูลผู้ดูแลไม่สำเร็จ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addRoom = async () => {
    if (!newRoom.roomNumber || !newRoom.type || !newRoom.price || !newRoom.description) {
      setError('กรุณากรอกข้อมูลห้องพักให้ครบ');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.post('/api/rooms', {
        ...newRoom,
        price: Number(newRoom.price),
      });
      setNewRoom(initialRoomForm);
      await fetchDashboardData();
    } catch (err) {
      setError('เพิ่มห้องพักไม่สำเร็จ');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = async (id) => {
    try {
      await api.delete(`/api/rooms/${id}`);
      await fetchDashboardData();
    } catch (err) {
      setError('ลบห้องพักไม่สำเร็จ');
      console.error(err);
    }
  };

  const updateStatus = async (id, status) => {
    const currentIndex = roomStatuses.indexOf(status);
    const nextStatus = roomStatuses[(currentIndex + 1) % roomStatuses.length];

    try {
      await api.put(`/api/rooms/${id}`, { status: nextStatus });
      await fetchDashboardData();
    } catch (err) {
      setError('อัปเดตสถานะห้องพักไม่สำเร็จ');
      console.error(err);
    }
  };

  if (currentUser?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h2>แผงควบคุมผู้ดูแลรีสอร์ท</h2>
          <p>ดูข้อมูลห้องพัก การจอง และจัดการสถานะได้จากหน้าเดียว</p>
        </div>
        <div className="admin-profile">
          <span>{currentUser.username}</span>
          <span>{currentUser.email}</span>
          <span>{currentUser.phone}</span>
        </div>
      </div>

      <div className="admin-form">
        <input
          placeholder="เลขห้อง"
          value={newRoom.roomNumber}
          onChange={(event) => setNewRoom({ ...newRoom, roomNumber: event.target.value })}
        />
        <input
          placeholder="ประเภทห้อง"
          value={newRoom.type}
          onChange={(event) => setNewRoom({ ...newRoom, type: event.target.value })}
        />
        <input
          placeholder="ราคา"
          type="number"
          min="0"
          value={newRoom.price}
          onChange={(event) => setNewRoom({ ...newRoom, price: event.target.value })}
        />
        <select
          value={newRoom.status}
          onChange={(event) => setNewRoom({ ...newRoom, status: event.target.value })}
        >
          {roomStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <input
          placeholder="รายละเอียดห้อง"
          value={newRoom.description}
          onChange={(event) => setNewRoom({ ...newRoom, description: event.target.value })}
        />
        <button onClick={addRoom} disabled={saving}>
          {saving ? 'กำลังเพิ่ม...' : 'เพิ่มห้องพัก'}
        </button>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      {loading ? (
        <p className="admin-status">กำลังโหลดข้อมูล...</p>
      ) : (
        <>
          <section className="admin-section">
            <h3>รายการห้องพัก</h3>
            <table className="room-table">
              <thead>
                <tr>
                  <th>เลขห้อง</th>
                  <th>ประเภท</th>
                  <th>ราคา</th>
                  <th>รายละเอียด</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room._id}>
                    <td>{room.roomNumber}</td>
                    <td>{room.type}</td>
                    <td>{Number(room.price || 0).toLocaleString()}</td>
                    <td>{room.description}</td>
                    <td>{room.status}</td>
                    <td>
                      <button onClick={() => updateStatus(room._id, room.status)}>
                        เปลี่ยนสถานะ
                      </button>
                      <button className="del-btn" onClick={() => deleteRoom(room._id)}>
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="admin-section">
            <h3>รายการจองล่าสุด</h3>
            <table className="room-table">
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>ผู้จอง</th>
                  <th>เบอร์</th>
                  <th>วันที่เข้าพัก</th>
                  <th>วันที่ออก</th>
                  <th>สถานะ</th>
                  <th>ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.roomNumber}</td>
                    <td>{booking.customerName}</td>
                    <td>{booking.phone || '-'}</td>
                    <td>{booking.checkInDate}</td>
                    <td>{booking.checkOutDate}</td>
                    <td>{booking.status}</td>
                    <td>{Number(booking.finalPrice || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
