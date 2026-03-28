import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './Home';
import RoomList from './RoomList';
import Booking from './Booking';
import AdminDashboard from './AdminDashboard';
import Login from './Login';
import MyBookings from './MyBookings';
import { clearStoredUser, getStoredUser } from './auth';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const handleLogout = () => {
    clearStoredUser();
    setCurrentUser(null);
  };

  return (
    <Router>
      <nav className="navbar">
        <Link to="/">หน้าแรก</Link>
        <Link to="/rooms">ห้องพักรีสอร์ท</Link>

        {currentUser?.role === 'user' ? <Link to="/my-bookings">การจองของฉัน</Link> : null}
        {currentUser?.role === 'admin' ? <Link to="/admin">จัดการรีสอร์ท</Link> : null}

        <div className="navbar-right">
          {currentUser ? (
            <>
              <span className="user-chip">
                {currentUser.username} ({currentUser.role})
              </span>
              <button type="button" className="nav-button" onClick={handleLogout}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <Link to="/login" className="login-link">เข้าสู่ระบบ</Link>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home currentUser={currentUser} />} />
        <Route path="/rooms" element={<RoomList currentUser={currentUser} />} />
        <Route path="/booking" element={<Booking currentUser={currentUser} />} />
        <Route path="/my-bookings" element={currentUser ? <MyBookings /> : <Navigate to="/login" replace />} />
        <Route
          path="/admin"
          element={currentUser?.role === 'admin' ? <AdminDashboard currentUser={currentUser} /> : <Navigate to="/login" replace />}
        />
        <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
