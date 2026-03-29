import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from './api';
import { getStoredUser } from './auth';
import './Payment.css';

function PaymentStepBar() {
  const steps = [
    { label: 'เลือกห้อง', state: 'done' },
    { label: 'ข้อมูลเข้าพัก', state: 'done' },
    { label: 'ชำระเงิน', state: 'active' },
  ];

  return (
    <div className="payment-steps">
      {steps.map((step) => (
        <div key={step.label} className={`payment-step payment-step-${step.state}`}>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function Payment({ currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = currentUser || getStoredUser();
  const selectedRooms = location.state?.selectedRooms || [];
  const bookingDraft = location.state?.bookingDraft;

  const [slipFile, setSlipFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const qrImageUrl = 'http://localhost:5000/uploads/QR_formoney.jpg';

  const slipPreview = useMemo(() => {
    if (!slipFile) {
      return '';
    }

    return URL.createObjectURL(slipFile);
  }, [slipFile]);

  if (!user || !selectedRooms.length || !bookingDraft) {
    return (
      <div className="payment-container">
        <h2>ยังไม่มีข้อมูลการจองสำหรับชำระเงิน</h2>
        <Link to="/rooms" className="payment-link">กลับไปเลือกห้องพัก</Link>
      </div>
    );
  }

  const depositRate = 0.25;
  const depositAmount = Math.ceil(Number(bookingDraft.totalPrice || 0) * depositRate);

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmitPayment = async (event) => {
    event.preventDefault();

    if (!slipFile) {
      setError('กรุณาแนบสลิปก่อนส่งข้อมูล');
      return;
    }

    const confirmed = window.confirm(
      'ระบบกำลังส่งสลิปให้ Admin ตรวจสอบ และหากมีการยกเลิกการจองจะไม่มีการคืนเงินมัดจำ'
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const slipDataUrl = await readFileAsDataUrl(slipFile);

      await api.post('/api/payments/submit', {
        userId: user._id,
        roomIds: selectedRooms.map((room) => room._id),
        customerName: bookingDraft.customerName,
        email: bookingDraft.email,
        phone: bookingDraft.phone,
        checkInDate: bookingDraft.checkInDate,
        checkOutDate: bookingDraft.checkOutDate,
        paymentMethod: 'transfer',
        slipDataUrl,
      });

      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถส่งข้อมูลการชำระเงินได้');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToBooking = () => {
    navigate('/booking', {
      state: {
        bookingDraft,
        searchDates: {
          checkInDate: bookingDraft.checkInDate,
          checkOutDate: bookingDraft.checkOutDate,
        },
        selectedRooms,
      },
    });
  };

  return (
    <div className="payment-container">
      <div className="payment-card">
        <PaymentStepBar />
        <div className="payment-header">
          <div>
            <h2>ชำระมัดจำการจอง</h2>
            <p>ตรวจสอบยอดและสแกน QR เพื่อชำระเงินก่อนแนบสลิป</p>
          </div>
          <button type="button" className="payment-back-btn" onClick={handleBackToBooking}>
            กลับไปแก้ข้อมูล
          </button>
        </div>

        <div className="payment-layout">
          <div className="payment-summary">
            <strong>ห้องที่เลือก</strong>
            <ul className="payment-room-list">
              {selectedRooms.map((room) => (
                <li key={room._id}>
                  ห้อง {room.roomNumber} - {room.type} ({Number(room.price || 0).toLocaleString()} บาท/คืน)
                </li>
              ))}
            </ul>
            <p><strong>ผู้เข้าพัก:</strong> {bookingDraft.customerName}</p>
            <p><strong>วันเข้าพัก:</strong> {bookingDraft.checkInDate}</p>
            <p><strong>วันออก:</strong> {bookingDraft.checkOutDate}</p>
            <p><strong>จำนวนคืน:</strong> {bookingDraft.totalNights}</p>
            <p><strong>ยอดเต็ม:</strong> {Number(bookingDraft.totalPrice || 0).toLocaleString()} บาท</p>
            <p><strong>มัดจำ 25%:</strong> {depositAmount.toLocaleString()} บาท</p>
          </div>

          <div className="payment-qr-card">
            <span className="payment-qr-chip">พร้อมสแกนจ่าย</span>
            <img src={qrImageUrl} alt="QR for payment" className="payment-qr-image" />
            <strong>QR สำหรับชำระมัดจำ</strong>
            <p>หลังจากโอนเงินแล้ว กรุณาแนบสลิปในฟอร์มด้านล่างเพื่อส่งให้แอดมินตรวจสอบ</p>
            <div className="payment-qr-amount">{depositAmount.toLocaleString()} บาท</div>
          </div>
        </div>

        <div className="payment-alert">
          ระบบจะส่งสลิปให้แอดมินตรวจสอบก่อนยืนยันการจอง และหากมีการยกเลิกจะไม่มีการคืนเงินมัดจำ
        </div>

        <form onSubmit={handleSubmitPayment} className="payment-form">
          <label className="payment-upload">
            แนบสลิปการโอนเงิน
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setSlipFile(event.target.files?.[0] || null)}
            />
          </label>

          {slipPreview ? <img src={slipPreview} alt="Slip preview" className="payment-preview" /> : null}
          {error ? <p className="payment-error">{error}</p> : null}

          <button type="submit" className="payment-btn" disabled={submitting}>
            {submitting ? 'กำลังส่งสลิป...' : 'ยืนยันการชำระเงิน'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Payment;
