import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from './api';
import './RoomList.css';

const statusMeta = {
  available: { label: 'พร้อมจอง', className: 'status-available' },
  booked: { label: 'จองแล้ว', className: 'status-booked' },
  occupied: { label: 'เข้าพักอยู่', className: 'status-occupied' },
};

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

function hasOverlap(period, checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) {
    return false;
  }

  return period.checkInDate < checkOutDate && period.checkOutDate > checkInDate;
}

function formatDisplayDate(dateString) {
  if (!dateString) {
    return '-';
  }

  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function RoomList({ currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSearchDates = location.state?.searchDates || { checkInDate: '', checkOutDate: '' };

  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState(location.state?.selectedRooms || []);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchDates, setSearchDates] = useState(initialSearchDates);

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

  const searchNotice = useMemo(() => {
    if (!searchDates.checkInDate && !searchDates.checkOutDate) {
      return {
        type: 'info',
        message: 'เลือกวันเข้าพักและวันออกเพื่อให้ระบบช่วยกรองห้องและเตือนช่วงที่ติดจองได้ทันที',
      };
    }

    if (!searchDates.checkInDate || !searchDates.checkOutDate) {
      return {
        type: 'warning',
        message: 'กรุณาเลือกวันเข้าพักและวันออกให้ครบก่อน ระบบจะช่วยเช็กห้องที่ชนกับการจองเดิมให้',
      };
    }

    if (searchDates.checkOutDate <= searchDates.checkInDate) {
      return {
        type: 'warning',
        message: 'วันออกต้องอยู่หลังวันเข้าพัก กรุณาตรวจสอบช่วงวันที่อีกครั้ง',
      };
    }

    return {
      type: 'success',
      message: `กำลังค้นหาห้องสำหรับช่วงวันที่ ${formatDisplayDate(searchDates.checkInDate)} ถึง ${formatDisplayDate(searchDates.checkOutDate)}`,
    };
  }, [searchDates.checkInDate, searchDates.checkOutDate]);

  const filteredRooms = useMemo(() => {
    return rooms.map((room) => {
      const overlappingPeriods = (room.bookedPeriods || []).filter((period) =>
        hasOverlap(period, searchDates.checkInDate, searchDates.checkOutDate)
      );

      return {
        ...room,
        hasOverlap: overlappingPeriods.length > 0,
        overlappingPeriods,
        displayStatus:
          searchDates.checkInDate && searchDates.checkOutDate && !overlappingPeriods.length
            ? 'available'
            : room.status,
      };
    });
  }, [rooms, searchDates.checkInDate, searchDates.checkOutDate]);

  const selectedSummary = useMemo(() => {
    const nights =
      searchDates.checkInDate && searchDates.checkOutDate && searchDates.checkOutDate > searchDates.checkInDate
        ? Math.ceil((new Date(searchDates.checkOutDate) - new Date(searchDates.checkInDate)) / (1000 * 60 * 60 * 24))
        : 0;

    const totalPerNight = selectedRooms.reduce((sum, room) => sum + Number(room.price || 0), 0);

    return {
      nights,
      totalPerNight,
      totalPrice: totalPerNight * nights,
    };
  }, [searchDates.checkInDate, searchDates.checkOutDate, selectedRooms]);

  const availableRoomCount = filteredRooms.filter((room) => !room.hasOverlap).length;

  const updateSearchDates = (field, value) => {
    setSearchDates((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleRoomSelection = (room) => {
    if (!searchDates.checkInDate || !searchDates.checkOutDate) {
      window.alert('กรุณาเลือกวันเข้าพักและวันออกก่อนเลือกห้องพัก');
      return;
    }

    if (searchDates.checkOutDate <= searchDates.checkInDate) {
      window.alert('วันออกต้องอยู่หลังวันเข้าพักก่อนจึงจะเลือกห้องได้');
      return;
    }

    if (room.hasOverlap) {
      window.alert('ห้องนี้มีการจองซ้อนในช่วงวันที่คุณเลือก กรุณาเลือกห้องอื่น');
      return;
    }

    setSelectedRooms((currentSelection) => {
      const exists = currentSelection.find((selectedRoom) => selectedRoom._id === room._id);

      if (exists) {
        return currentSelection.filter((selectedRoom) => selectedRoom._id !== room._id);
      }

      return [...currentSelection, room];
    });
  };

  const handleGoToBooking = () => {
    if (!searchDates.checkInDate || !searchDates.checkOutDate) {
      window.alert('กรุณาเลือกวันเข้าพักและวันออกก่อนดำเนินการต่อ');
      return;
    }

    if (searchDates.checkOutDate <= searchDates.checkInDate) {
      window.alert('วันออกต้องอยู่หลังวันเข้าพัก');
      return;
    }

    navigate('/booking', {
      state: {
        selectedRooms,
        searchDates,
      },
    });
  };

  const openRoomModal = (room) => {
    setActiveRoom(room);
    setActiveImageIndex(0);
  };

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

  const activeImages = activeRoom?.images?.length ? activeRoom.images : [];
  const activeImage = activeImages[activeImageIndex] || '';

  return (
    <div className="room-container">
      <div className="room-heading">
        <h2>ห้องพักรีสอร์ท</h2>
        <p>กดดูรายละเอียดห้องเพื่อเช็กช่วงวันที่ถูกจอง รูปภาพ และคำอธิบาย ก่อนเพิ่มลงในรายการจอง</p>
      </div>

      <section className="sticky-search-shell">
        <div className="sticky-search-bar">
          <div className="sticky-search-copy">
            <strong>ค้นหาห้องตามช่วงวันที่</strong>
            <span>เปลี่ยนวันได้ตลอดจากหน้านี้โดยไม่ต้องย้อนกลับ</span>
          </div>

          <label className="sticky-search-field">
            <span>วันเข้าพัก</span>
            <input
              type="date"
              value={searchDates.checkInDate}
              onChange={(event) => updateSearchDates('checkInDate', event.target.value)}
            />
          </label>

          <label className="sticky-search-field">
            <span>วันออก</span>
            <input
              type="date"
              min={searchDates.checkInDate || undefined}
              value={searchDates.checkOutDate}
              onChange={(event) => updateSearchDates('checkOutDate', event.target.value)}
            />
          </label>

          <div className="sticky-search-summary">
            <strong>{availableRoomCount}</strong>
            <span>ห้องที่ยังพอเลือกได้ในช่วงนี้</span>
          </div>
        </div>

        <div className={`search-notice search-notice-${searchNotice.type}`}>
          {searchNotice.message}
        </div>
      </section>

      {filteredRooms.length === 0 ? (
        <div className="empty-state">
          <p>ไม่พบห้องพักในระบบ</p>
        </div>
      ) : (
        <div className="room-grid">
          {filteredRooms.map((room) => {
            const isSelected = selectedRooms.some((selectedRoom) => selectedRoom._id === room._id);
            const meta = statusMeta[room.displayStatus] || statusMeta.available;
            const primaryImage = resolveImageUrl(room.images?.[0]);

            return (
              <button
                key={room._id}
                type="button"
                className={`room-card room-card-button ${isSelected ? 'room-card-selected' : ''}`}
                onClick={() => openRoomModal(room)}
              >
                {primaryImage ? (
                  <img src={primaryImage} alt={`ห้อง ${room.roomNumber}`} className="room-image" />
                ) : (
                  <div className="room-image room-image-placeholder">ยังไม่มีรูปห้อง</div>
                )}

                <div className="room-card-top">
                  <h3>ห้อง {room.roomNumber}</h3>
                  <span className={`status-badge ${meta.className}`}>{meta.label}</span>
                </div>

                <p className="room-type">{room.type}</p>
                <p className="room-description">{room.description || 'ยังไม่มีรายละเอียดห้องพัก'}</p>
                <div className="room-price">{Number(room.price || 0).toLocaleString()} บาท / คืน</div>

                <div className="room-inline-periods">
                  <strong>ช่วงที่มีการจอง</strong>
                  {(room.bookedPeriods || []).length ? (
                    <ul className="room-inline-period-list">
                      {room.bookedPeriods.slice(0, 2).map((period) => (
                        <li key={period.bookingId}>
                          {formatDisplayDate(period.checkInDate)} - {formatDisplayDate(period.checkOutDate)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="room-inline-period-empty">ยังไม่มีรายการจองเดิม</span>
                  )}
                </div>

                {room.hasOverlap ? (
                  <div className="room-card-warning">ช่วงวันที่ที่เลือกชนกับการจองเดิม</div>
                ) : (
                  <div className="room-card-success">กดดูรายละเอียดและเลือกห้องนี้ได้</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeRoom ? (
        <div className="room-modal-backdrop" onClick={() => setActiveRoom(null)}>
          <div className="room-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="room-modal-close" onClick={() => setActiveRoom(null)}>
              ปิด
            </button>

            {activeImage ? (
              <img
                src={resolveImageUrl(activeImage)}
                alt={`ห้อง ${activeRoom.roomNumber}`}
                className="room-modal-image"
              />
            ) : (
              <div className="room-modal-image room-image-placeholder">ยังไม่มีรูปห้อง</div>
            )}

            {activeImages.length > 1 ? (
              <div className="room-gallery-strip">
                {activeImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className={`room-gallery-thumb ${index === activeImageIndex ? 'room-gallery-thumb-active' : ''}`}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img src={resolveImageUrl(image)} alt={`รูปห้อง ${activeRoom.roomNumber} ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}

            <h3>ห้อง {activeRoom.roomNumber}</h3>
            <p>{activeRoom.type}</p>
            <p>{activeRoom.description || 'ยังไม่มีรายละเอียดห้องพัก'}</p>
            <p><strong>ราคา:</strong> {Number(activeRoom.price || 0).toLocaleString()} บาท / คืน</p>

            {searchDates.checkInDate && searchDates.checkOutDate ? (
              <>
                <p>
                  <strong>ช่วงวันที่ที่คุณเลือก:</strong> {formatDisplayDate(searchDates.checkInDate)} ถึง {formatDisplayDate(searchDates.checkOutDate)}
                </p>
                {activeRoom.hasOverlap ? (
                  <div className="room-warning">
                    ห้องนี้มีการจองซ้อนในช่วงวันที่ที่คุณเลือก กรุณาเปลี่ยนห้องหรือเปลี่ยนช่วงวันเข้าพัก
                  </div>
                ) : (
                  <div className="room-success">
                    ห้องนี้ยังว่างในช่วงวันที่ที่คุณเลือก สามารถเพิ่มเข้ารายการจองได้
                  </div>
                )}
              </>
            ) : (
              <div className="room-warning">
                เลือกวันเข้าพักและวันออกจากแถบด้านบนก่อน ระบบจะช่วยเตือนให้ทันทีว่าห้องนี้ติดจองหรือไม่
              </div>
            )}

            <div className="booking-periods booking-periods-modal">
              <strong>ช่วงเวลาที่ถูกจอง</strong>
              {activeRoom.bookedPeriods?.length ? (
                <ul className="booking-period-list">
                  {activeRoom.bookedPeriods.map((period) => (
                    <li key={period.bookingId}>
                      {formatDisplayDate(period.checkInDate)} ถึง {formatDisplayDate(period.checkOutDate)} ({period.status})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="booking-period-empty">ยังไม่มีการจองในระบบ</p>
              )}
            </div>

            <div className="room-modal-actions">
              {currentUser?.role === 'admin' ? (
                <Link to="/admin" className="book-btn admin-link">ไปหน้าแก้ไขห้อง</Link>
              ) : currentUser?.role === 'user' ? (
                <button
                  type="button"
                  className="book-btn room-select-button"
                  onClick={() => {
                    toggleRoomSelection(activeRoom);
                    if (!activeRoom.hasOverlap) {
                      setActiveRoom(null);
                    }
                  }}
                >
                  {selectedRooms.some((selectedRoom) => selectedRoom._id === activeRoom._id) ? 'เอาออกจากรายการ' : 'เลือกห้องนี้'}
                </button>
              ) : (
                <Link to="/login" className="book-btn">เข้าสู่ระบบเพื่อจอง</Link>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {currentUser?.role === 'user' ? (
        <div className={`floating-cart ${selectedRooms.length ? 'floating-cart-visible' : ''}`}>
          <div className="floating-cart-copy">
            <strong>เลือกแล้ว {selectedRooms.length} ห้อง</strong>
            <span>
              {selectedSummary.nights > 0
                ? `รวม ${selectedSummary.totalPrice.toLocaleString()} บาท สำหรับ ${selectedSummary.nights} คืน`
                : `รวม ${selectedSummary.totalPerNight.toLocaleString()} บาทต่อคืน`}
            </span>
          </div>
          <button
            type="button"
            className="selection-button"
            onClick={handleGoToBooking}
            disabled={!selectedRooms.length}
          >
            ไปกรอกรายละเอียดการจอง
          </button>
        </div>
      ) : null}

      <Link to="/" className="back-btn">กลับหน้าแรก</Link>
    </div>
  );
}

export default RoomList;
