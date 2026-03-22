const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ข้อมูลห้องพัก (แนะนำ: เก็บไว้ที่ตัวแปรแบบนี้ไปก่อนครับ พรุ่งนี้ค่อยอธิบายอาจารย์ว่านี่คือ In-memory Data)
let rooms = [
    { id: 1, roomNumber: "101", type: "Deluxe", price: 1500, status: "ว่าง" },
    { id: 2, roomNumber: "102", type: "Standard", price: 800, status: "ไม่ว่าง" }
];

// 1. ดึงรายการห้องพัก (คุณทำแล้ว)
app.get('/api/rooms', (req, res) => {
    res.json(rooms);
});

// 2. อัปเดตสถานะห้องพัก (เพิ่มตัวนี้เข้าไปเพื่อให้หน้า Admin ใช้งานได้จริง!)
app.put('/api/rooms/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    rooms = rooms.map(room => room.id == id ? { ...room, status } : room);
    res.json({ message: "อัปเดตสำเร็จ", rooms });
});

// เพิ่มห้อง (POST)
app.post('/api/rooms', (req, res) => {
    const newRoom = { id: Date.now(), ...req.body };
    rooms.push(newRoom);
    res.json(newRoom);
});

// ลบห้อง (DELETE)
app.delete('/api/rooms/:id', (req, res) => {
    rooms = rooms.filter(r => r.id != req.params.id);
    res.json({ message: "ลบสำเร็จ" });
});

app.listen(5000, () => {
    console.log("Server กำลังวิ่งอยู่ที่ http://localhost:5000");
});