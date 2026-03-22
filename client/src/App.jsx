import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './Home';
import RoomList from './RoomList';
import Booking from './Booking';
import AdminDashboard from './AdminDashboard';
import Login from './Login';
import './App.css'; // อย่าลืมใส่สไตล์กลางที่นี่

function App() {
  return (
    <Router>
      {/* ส่วนของเมนูนำทางที่จะแสดงทุกหน้า */}
      <nav className="navbar">
        <Link to="/">หน้าแรก</Link>
        <Link to="/rooms">รายการห้องพัก</Link>
        <Link to="/booking">จองห้องพัก</Link>
        <Link to="/admin">จัดการ(Admin)</Link>
        <Link to="/login" className="login-link">เข้าสู่ระบบ</Link>
      </nav>

      {/* ส่วนของเนื้อหาที่จะเปลี่ยนไปตามหน้าต่างๆ */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<RoomList />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;