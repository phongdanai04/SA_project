import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from './api';
import './AdminDashboard.css';

const initialRoomForm = {
  roomNumber: '',
  type: '',
  price: '',
  status: 'available',
  description: '',
  imagesText: '',
};

const roomStatuses = ['available', 'booked', 'occupied'];
const adminTabs = [
  { id: 'rooms', label: 'จัดการห้องพัก' },
  { id: 'payments', label: 'ยืนยันสลิป' },
  { id: 'stay', label: 'เช็กอิน / เช็กเอาต์' },
];

const statusLabelMap = {
  available: 'พร้อมจอง',
  booked: 'จองแล้ว',
  occupied: 'เข้าพักอยู่',
  pending: 'รอตรวจสลิป',
  approved: 'อนุมัติแล้ว',
  booked_payment: 'ชำระแล้ว',
  'checked-in': 'เช็กอินแล้ว',
  'checked-out': 'เช็กเอาต์แล้ว',
  'cancelled-no-refund': 'ยกเลิก ไม่คืนมัดจำ',
};

function normalizeImages(imagesText) {
  return imagesText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(dateString) {
  if (!dateString) {
    return '-';
  }

  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString) {
  if (!dateString) {
    return '-';
  }

  return new Date(dateString).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveImageUrl(imagePath) {
  if (!imagePath) {
    return '';
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  if (imagePath.startsWith('/uploads/')) {
    return `http://localhost:5000${imagePath}`;
  }

  return `http://localhost:5000/uploads/${imagePath}`;
}

function StatusBadge({ value }) {
  return <span className={`admin-status-badge admin-status-${value}`}>{statusLabelMap[value] || value}</span>;
}

function RoomImagePreview({ images = [] }) {
  const previewImages = images.slice(0, 3);

  if (!previewImages.length) {
    return <span className="admin-muted">ยังไม่มีรูป</span>;
  }

  return (
    <div className="room-image-preview-row">
      {previewImages.map((image, index) => (
        <img
          key={`${image}-${index}`}
          src={resolveImageUrl(image)}
          alt={`room preview ${index + 1}`}
          className="room-image-preview"
        />
      ))}
    </div>
  );
}

function FilePreviewList({ files }) {
  const previews = useMemo(
    () =>
      (files || []).map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  if (!previews.length) {
    return null;
  }

  return (
    <div className="upload-preview-grid">
      {previews.map((preview) => (
        <div key={preview.name} className="upload-preview-card">
          <img src={preview.url} alt={preview.name} />
          <span>{preview.name}</span>
        </div>
      ))}
    </div>
  );
}

function AdminDashboard({ currentUser }) {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [newRoom, setNewRoom] = useState(initialRoomForm);
  const [newRoomImageFiles, setNewRoomImageFiles] = useState([]);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoom, setEditingRoom] = useState(initialRoomForm);
  const [editingImageFiles, setEditingImageFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('rooms');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === 'pending'),
    [payments]
  );

  const readyForCheckIn = useMemo(
    () => bookings.filter((booking) => booking.status === 'booked'),
    [bookings]
  );

  const checkedInGuests = useMemo(
    () => bookings.filter((booking) => booking.status === 'checked-in'),
    [bookings]
  );

  const checkedOutGuests = useMemo(
    () => bookings.filter((booking) => booking.status === 'checked-out'),
    [bookings]
  );

  const readFilesAsDataUrls = (files) =>
    Promise.all(
      Array.from(files || []).map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

  const uploadRoomImages = async (roomNumber, files) => {
    if (!files || files.length === 0) {
      return [];
    }

    const imagesDataUrls = await readFilesAsDataUrls(files);
    const response = await api.post('/api/uploads/room-images', {
      roomNumber,
      imagesDataUrls,
    });

    return response.data.images || [];
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [roomsResponse, bookingsResponse, paymentsResponse] = await Promise.all([
        api.get('/api/rooms'),
        api.get('/api/bookings', { params: { role: 'admin' } }),
        api.get('/api/payments', { params: { role: 'admin' } }),
      ]);

      setRooms(roomsResponse.data);
      setBookings(bookingsResponse.data);
      setPayments(paymentsResponse.data);
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

      const uploadedImages = await uploadRoomImages(newRoom.roomNumber, newRoomImageFiles);

      await api.post('/api/rooms', {
        ...newRoom,
        price: Number(newRoom.price),
        images: [...normalizeImages(newRoom.imagesText), ...uploadedImages],
      });

      setNewRoom(initialRoomForm);
      setNewRoomImageFiles([]);
      await fetchDashboardData();
    } catch (err) {
      setError('เพิ่มห้องพักไม่สำเร็จ');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEditRoom = (room) => {
    setEditingRoomId(room._id);
    setEditingRoom({
      roomNumber: room.roomNumber || '',
      type: room.type || '',
      price: String(room.price || ''),
      status: room.status || 'available',
      description: room.description || '',
      imagesText: (room.images || []).join(', '),
    });
    setEditingImageFiles([]);
  };

  const saveEditRoom = async () => {
    try {
      setSaving(true);
      setError('');

      const uploadedImages = await uploadRoomImages(editingRoom.roomNumber, editingImageFiles);

      await api.put(`/api/rooms/${editingRoomId}`, {
        ...editingRoom,
        price: Number(editingRoom.price),
        images: [...normalizeImages(editingRoom.imagesText), ...uploadedImages],
      });

      setEditingRoomId(null);
      setEditingRoom(initialRoomForm);
      setEditingImageFiles([]);
      await fetchDashboardData();
    } catch (err) {
      setError('แก้ไขข้อมูลห้องพักไม่สำเร็จ');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditRoom = () => {
    setEditingRoomId(null);
    setEditingRoom(initialRoomForm);
    setEditingImageFiles([]);
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

  const approvePayment = async (paymentId) => {
    try {
      await api.patch(`/api/payments/${paymentId}/approve`, {
        adminName: currentUser.username,
      });
      await fetchDashboardData();
    } catch (err) {
      setError('ยืนยันการจองไม่สำเร็จ');
      console.error(err);
    }
  };

  const confirmCheckIn = async (bookingId) => {
    try {
      await api.patch(`/api/bookings/${bookingId}/checkin`);
      await fetchDashboardData();
    } catch (err) {
      setError('ยืนยันการเช็กอินไม่สำเร็จ');
      console.error(err);
    }
  };

  const confirmCheckout = async (bookingId) => {
    try {
      await api.patch(`/api/bookings/${bookingId}/checkout`);
      await fetchDashboardData();
    } catch (err) {
      setError('ยืนยันการเช็กเอาต์ไม่สำเร็จ');
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
          <h2>จัดการรีสอร์ทและหน้าเคาน์เตอร์</h2>
          <p>แยกงานหลักออกเป็นแท็บเพื่อให้ตรวจสลิป ดูการเข้าพัก และแก้ห้องพักได้ง่ายขึ้น</p>
        </div>
        <div className="admin-profile">
          <span>{currentUser.username}</span>
          <span>{currentUser.email}</span>
          <span>{currentUser.phone}</span>
        </div>
      </div>

      <div className="admin-overview-grid">
        <article className="overview-card">
          <span>รอตรวจสลิป</span>
          <strong>{pendingPayments.length}</strong>
        </article>
        <article className="overview-card">
          <span>รอเช็กอิน</span>
          <strong>{readyForCheckIn.length}</strong>
        </article>
        <article className="overview-card">
          <span>กำลังเข้าพัก</span>
          <strong>{checkedInGuests.length}</strong>
        </article>
        <article className="overview-card">
          <span>ห้องทั้งหมด</span>
          <strong>{rooms.length}</strong>
        </article>
      </div>

      <div className="admin-tabs">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab ${activeTab === tab.id ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {loading ? <p className="admin-status">กำลังโหลดข้อมูล...</p> : null}

      {!loading && activeTab === 'rooms' ? (
        <>
          <section className="admin-section admin-section-soft">
            <h3>เพิ่มห้องพักใหม่</h3>
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
                placeholder="อธิบายจุดเด่นของห้อง"
                value={newRoom.description}
                onChange={(event) => setNewRoom({ ...newRoom, description: event.target.value })}
              />
              <input
                placeholder="พาธรูปเดิม เช่น /uploads/room-101-1.png"
                value={newRoom.imagesText}
                onChange={(event) => setNewRoom({ ...newRoom, imagesText: event.target.value })}
              />
            </div>

            <label className="admin-upload admin-upload-large">
              <strong>อัปโหลดรูปห้องแบบลากวางหรือเลือกไฟล์</strong>
              <span>ไฟล์ที่อัปโหลดจะถูกเก็บไว้ในโฟลเดอร์ uploads ของ server และนำไปใช้หน้า frontend ได้ทันที</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setNewRoomImageFiles(Array.from(event.target.files || []))}
              />
            </label>
            <FilePreviewList files={newRoomImageFiles} />

            <div className="admin-add-actions">
              <button onClick={addRoom} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกห้องพัก'}
              </button>
            </div>
          </section>

          <section className="admin-section">
            <h3>จัดการข้อมูลห้องพัก</h3>
            <table className="room-table">
              <thead>
                <tr>
                  <th>เลขห้อง</th>
                  <th>ประเภท</th>
                  <th>ราคา</th>
                  <th>คำอธิบาย</th>
                  <th>รูป</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  editingRoomId === room._id ? (
                    <tr key={room._id}>
                      <td><input value={editingRoom.roomNumber} onChange={(event) => setEditingRoom({ ...editingRoom, roomNumber: event.target.value })} /></td>
                      <td><input value={editingRoom.type} onChange={(event) => setEditingRoom({ ...editingRoom, type: event.target.value })} /></td>
                      <td><input type="number" value={editingRoom.price} onChange={(event) => setEditingRoom({ ...editingRoom, price: event.target.value })} /></td>
                      <td><input value={editingRoom.description} onChange={(event) => setEditingRoom({ ...editingRoom, description: event.target.value })} /></td>
                      <td>
                        <input value={editingRoom.imagesText} onChange={(event) => setEditingRoom({ ...editingRoom, imagesText: event.target.value })} />
                        <label className="admin-upload admin-upload-inline">
                          เพิ่มรูปใหม่
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => setEditingImageFiles(Array.from(event.target.files || []))}
                          />
                        </label>
                        <FilePreviewList files={editingImageFiles} />
                      </td>
                      <td>
                        <select value={editingRoom.status} onChange={(event) => setEditingRoom({ ...editingRoom, status: event.target.value })}>
                          {roomStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="approve-btn" onClick={saveEditRoom}>บันทึก</button>
                        <button className="cancel-btn" onClick={cancelEditRoom}>ยกเลิก</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={room._id}>
                      <td>{room.roomNumber}</td>
                      <td>{room.type}</td>
                      <td>{Number(room.price || 0).toLocaleString()}</td>
                      <td>{room.description}</td>
                      <td><RoomImagePreview images={room.images} /></td>
                      <td><StatusBadge value={room.status} /></td>
                      <td>
                        <button onClick={() => startEditRoom(room)}>แก้ไข</button>
                        <button onClick={() => updateStatus(room._id, room.status)}>เปลี่ยนสถานะ</button>
                        <button className="del-btn" onClick={() => deleteRoom(room._id)}>ลบ</button>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {!loading && activeTab === 'payments' ? (
        <section className="admin-section">
          <h3>รายการที่รอตรวจสลิป</h3>
          <table className="room-table">
            <thead>
              <tr>
                <th>เลขอ้างอิง</th>
                <th>ยอดมัดจำ</th>
                <th>ยอดเต็ม</th>
                <th>วิธีจ่าย</th>
                <th>สถานะ</th>
                <th>สลิป</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.map((payment) => (
                <tr key={payment._id}>
                  <td>{payment.bookingIds?.join(', ') || payment.bookingId}</td>
                  <td>{Number(payment.amount || 0).toLocaleString()}</td>
                  <td>{Number(payment.totalAmount || 0).toLocaleString()}</td>
                  <td>{payment.method}</td>
                  <td><StatusBadge value={payment.status} /></td>
                  <td>
                    {payment.paymentSlip ? (
                      <a href={`http://localhost:5000${payment.paymentSlip}`} target="_blank" rel="noreferrer">
                        เปิดสลิป
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <button className="approve-btn" onClick={() => approvePayment(payment._id)}>
                      อนุมัติการจอง
                    </button>
                  </td>
                </tr>
              ))}
              {!pendingPayments.length ? (
                <tr>
                  <td colSpan="7" className="admin-empty-cell">ตอนนี้ไม่มีสลิปรอตรวจสอบ</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {!loading && activeTab === 'stay' ? (
        <>
          <section className="admin-section">
            <h3>ลูกค้าที่พร้อมเช็กอิน</h3>
            <table className="room-table">
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>ผู้จอง</th>
                  <th>เบอร์โทร</th>
                  <th>วันเข้าพัก</th>
                  <th>วันออก</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {readyForCheckIn.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.roomNumber}</td>
                    <td>{booking.customerName}</td>
                    <td>{booking.phone || '-'}</td>
                    <td>{formatDate(booking.checkInDate)}</td>
                    <td>{formatDate(booking.checkOutDate)}</td>
                    <td><StatusBadge value={booking.status} /></td>
                    <td>
                      <button className="approve-btn" onClick={() => confirmCheckIn(booking._id)}>
                        ยืนยันเช็กอิน
                      </button>
                    </td>
                  </tr>
                ))}
                {!readyForCheckIn.length ? (
                  <tr>
                    <td colSpan="7" className="admin-empty-cell">ยังไม่มีลูกค้าที่รอเช็กอิน</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="admin-section">
            <h3>ลูกค้าที่กำลังเข้าพัก</h3>
            <table className="room-table">
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>ผู้เข้าพัก</th>
                  <th>เวลาเช็กอินจริง</th>
                  <th>กำหนดเช็กเอาต์</th>
                  <th>สถานะชำระเงิน</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {checkedInGuests.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.roomNumber}</td>
                    <td>{booking.customerName}</td>
                    <td>{formatDateTime(booking.checkInTime)}</td>
                    <td>{formatDate(booking.checkOutDate)}</td>
                    <td><StatusBadge value={booking.paymentStatus || 'approved'} /></td>
                    <td>
                      <button className="checkout-btn" onClick={() => confirmCheckout(booking._id)}>
                        ยืนยันเช็กเอาต์
                      </button>
                    </td>
                  </tr>
                ))}
                {!checkedInGuests.length ? (
                  <tr>
                    <td colSpan="6" className="admin-empty-cell">ตอนนี้ยังไม่มีลูกค้าที่กำลังเข้าพัก</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="admin-section">
            <h3>ประวัติการเช็กเอาต์ล่าสุด</h3>
            <table className="room-table">
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>ผู้เข้าพัก</th>
                  <th>วันเข้าพัก</th>
                  <th>เวลาเช็กอิน</th>
                  <th>เวลาเช็กเอาต์</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {checkedOutGuests.slice(0, 10).map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.roomNumber}</td>
                    <td>{booking.customerName}</td>
                    <td>{formatDate(booking.checkInDate)}</td>
                    <td>{formatDateTime(booking.checkInTime)}</td>
                    <td>{formatDateTime(booking.checkOutTime)}</td>
                    <td><StatusBadge value={booking.status} /></td>
                  </tr>
                ))}
                {!checkedOutGuests.length ? (
                  <tr>
                    <td colSpan="6" className="admin-empty-cell">ยังไม่มีประวัติการเช็กเอาต์</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
