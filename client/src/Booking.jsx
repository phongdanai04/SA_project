import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser } from './auth';
import './Booking.css';

function BookingStepBar() {
  const steps = [
    { label: 'เลือกห้อง', state: 'done' },
    { label: 'ข้อมูลเข้าพัก', state: 'active' },
    { label: 'ชำระเงิน', state: 'upcoming' },
  ];

  return (
    <div className="booking-steps">
      {steps.map((step) => (
        <div key={step.label} className={`booking-step booking-step-${step.state}`}>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function Booking({ currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedRooms = location.state?.selectedRooms || (location.state?.selectedRoom ? [location.state.selectedRoom] : []);
  const searchDates = location.state?.searchDates;
  const user = currentUser || getStoredUser();

  const initialForm = {
    customerName: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    checkInDate: searchDates?.checkInDate || '',
    checkOutDate: searchDates?.checkOutDate || '',
  };

  const [form, setForm] = useState(initialForm);

  const totalNights = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) {
      return 0;
    }

    return Math.max(0, Math.ceil((new Date(form.checkOutDate) - new Date(form.checkInDate)) / (1000 * 60 * 60 * 24)));
  }, [form.checkInDate, form.checkOutDate]);

  const totalPrice = selectedRooms.reduce(
    (sum, room) => sum + Number(room.price || 0) * totalNights,
    0
  );

  const dateNotice = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) {
      return {
        type: 'info',
        message: 'กรุณาเลือกวันเข้าพักและวันออกให้ครบ ระบบจะสรุปจำนวนคืนและยอดรวมให้ทันที',
      };
    }

    if (form.checkOutDate <= form.checkInDate) {
      return {
        type: 'warning',
        message: 'วันออกต้องอยู่หลังวันเข้าพัก กรุณาแก้ไขช่วงวันที่ก่อนไปขั้นตอนชำระเงิน',
      };
    }

    return {
      type: 'success',
      message: `กำลังจอง ${selectedRooms.length} ห้อง เป็นเวลา ${totalNights} คืน ระบบจะส่งข้อมูลนี้ต่อไปยังหน้าชำระเงิน`,
    };
  }, [form.checkInDate, form.checkOutDate, selectedRooms.length, totalNights]);

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
        <h2>บัญชีผู้ดูแลไม่สามารถสร้างการจองจากหน้านี้</h2>
        <Link to="/admin" className="inline-link">ไปหน้าผู้ดูแล</Link>
      </div>
    );
  }

  if (!selectedRooms.length) {
    return (
      <div className="booking-container">
        <h2>ยังไม่มีห้องพักที่เลือกไว้</h2>
        <p>กรุณากลับไปเลือกห้องพักจากหน้ารายการก่อน</p>
        <Link to="/rooms" className="inline-link">กลับไปเลือกห้องพัก</Link>
      </div>
    );
  }

  const applyProfile = () => {
    setForm((current) => ({
      ...current,
      customerName: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }));
  };

  const handleGoToPayment = (event) => {
    event.preventDefault();

    if (form.checkOutDate <= form.checkInDate) {
      return;
    }

    navigate('/payment', {
      state: {
        bookingDraft: {
          ...form,
          totalNights,
          totalPrice,
        },
        selectedRooms,
      },
    });
  };

  const handleBackToRooms = () => {
    navigate('/rooms', {
      state: {
        searchDates: {
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
        },
        selectedRooms,
      },
    });
  };

  return (
    <div className="booking-container booking-container-wide">
      <BookingStepBar />

      <div className="booking-header">
        <div>
          <h2>กรอกรายละเอียดการเข้าพัก</h2>
          <p>ระบบจะนำข้อมูลนี้ไปใช้สำหรับสร้างรายการจองและส่งให้แอดมินตรวจสอบสลิป</p>
        </div>
        <div className="booking-header-actions">
          <button type="button" className="secondary-action-btn" onClick={handleBackToRooms}>
            กลับไปเลือกห้อง
          </button>
          <button type="button" className="profile-fill-btn" onClick={applyProfile}>
            ใช้ข้อมูลโปรไฟล์
          </button>
        </div>
      </div>

      <div className="booking-layout">
        <div className="booking-card">
          <h3>ห้องที่เลือก</h3>
          {selectedRooms.map((room) => (
            <div key={room._id} className="booking-room-item">
              <p><strong>ห้อง:</strong> {room.roomNumber}</p>
              <p><strong>ประเภท:</strong> {room.type}</p>
              <p><strong>รายละเอียด:</strong> {room.description || '-'}</p>
              <p><strong>ราคาต่อคืน:</strong> {Number(room.price || 0).toLocaleString()} บาท</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleGoToPayment} className="booking-form booking-card">
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

          <div className="booking-date-grid">
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
                min={form.checkInDate || undefined}
                value={form.checkOutDate}
                onChange={(event) => setForm({ ...form, checkOutDate: event.target.value })}
              />
            </label>
          </div>

          <div className={`booking-notice booking-notice-${dateNotice.type}`}>
            {dateNotice.message}
          </div>

          <div className="booking-summary">
            <p>จำนวนห้องที่เลือก: {selectedRooms.length}</p>
            <p>จำนวนคืน: {totalNights}</p>
            <p>ราคารวมทุกห้อง: {totalPrice.toLocaleString()} บาท</p>
            <p>เวลาเช็กอินจริงจะถูกบันทึกโดยแอดมินเมื่อผู้เข้าพักมาถึงหน้าเคาน์เตอร์</p>
          </div>

          <button type="submit" className="confirm-btn" disabled={totalNights <= 0}>
            ไปหน้าชำระเงิน
          </button>
        </form>
      </div>
    </div>
  );
}

export default Booking;
