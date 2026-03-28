const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());

const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);

let db;

function getCollection(name) {
  return db.collection(name);
}

function toObjectId(value) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function calculateNights(checkInDate, checkOutDate) {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diff = end.getTime() - start.getTime();
  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 0;
}

async function connectDB() {
  try {
    await client.connect();
    db = client.db('hotelDB');
    console.log('Connected MongoDB');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const users = getCollection('users');
    const user = await users.findOne({
      $or: [{ username: identifier }, { email: identifier }],
      password,
    });

    if (!user) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้ อีเมล หรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.json({
      message: 'Login successful',
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = getCollection('rooms');
    const data = await rooms.find().sort({ roomNumber: 1 }).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const rooms = getCollection('rooms');
    const newRoom = {
      roomNumber: req.body.roomNumber,
      type: req.body.type,
      price: Number(req.body.price),
      status: req.body.status || 'available',
      images: Array.isArray(req.body.images) ? req.body.images : [],
      description: req.body.description || '',
      currentBookingId: null,
      createdAt: new Date(),
    };

    const result = await rooms.insertOne(newRoom);

    res.status(201).json({
      _id: result.insertedId,
      ...newRoom,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const rooms = getCollection('rooms');
    const roomId = toObjectId(req.params.id);

    if (!roomId) {
      return res.status(400).json({ error: 'Invalid room id' });
    }

    const { status, roomNumber, type, price, description, images, currentBookingId } = req.body;
    const updateData = {};

    if (status !== undefined) updateData.status = status;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (type !== undefined) updateData.type = type;
    if (price !== undefined) updateData.price = Number(price);
    if (description !== undefined) updateData.description = description;
    if (images !== undefined) updateData.images = images;
    if (currentBookingId !== undefined) updateData.currentBookingId = currentBookingId;

    const result = await rooms.updateOne({ _id: roomId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const updatedRoom = await rooms.findOne({ _id: roomId });
    res.json(updatedRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const rooms = getCollection('rooms');
    const roomId = toObjectId(req.params.id);

    if (!roomId) {
      return res.status(400).json({ error: 'Invalid room id' });
    }

    const result = await rooms.deleteOne({ _id: roomId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ message: 'Delete successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = getCollection('bookings');
    const { userId, role } = req.query;

    const query = {};

    if (role !== 'admin' && userId) {
      query.userId = userId;
    }

    const data = await bookings.find(query).sort({ createdAt: -1 }).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const {
      userId,
      roomId,
      customerName,
      email,
      phone,
      checkInDate,
      checkOutDate,
      checkInTime,
      checkOutTime,
      promotionId,
    } = req.body;

    if (!roomId || !customerName || !checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'ข้อมูลการจองไม่ครบ' });
    }

    const rooms = getCollection('rooms');
    const bookings = getCollection('bookings');
    const roomObjectId = toObjectId(roomId);

    if (!roomObjectId) {
      return res.status(400).json({ error: 'Invalid room id' });
    }

    const room = await rooms.findOne({ _id: roomObjectId });

    if (!room) {
      return res.status(404).json({ error: 'ไม่พบห้องพักที่ต้องการจอง' });
    }

    if (room.status !== 'available') {
      return res.status(409).json({ error: 'ห้องนี้ไม่พร้อมให้จองแล้ว' });
    }

    const totalNights = calculateNights(checkInDate, checkOutDate);

    if (totalNights <= 0) {
      return res.status(400).json({ error: 'วันเข้าพักและวันออกไม่ถูกต้อง' });
    }

    const totalPrice = room.price * totalNights;
    const booking = {
      userId: userId || null,
      roomId,
      roomNumber: room.roomNumber,
      roomType: room.type,
      customerName,
      email: email || null,
      phone: phone || null,
      checkInDate,
      checkOutDate,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      pricePerNight: room.price,
      totalNights,
      totalPrice,
      promotionId: promotionId || null,
      finalPrice: totalPrice,
      status: 'booked',
      createdAt: new Date(),
    };

    const result = await bookings.insertOne(booking);

    await rooms.updateOne(
      { _id: roomObjectId },
      {
        $set: {
          status: 'booked',
          currentBookingId: result.insertedId.toString(),
        },
      }
    );

    res.status(201).json({
      _id: result.insertedId,
      ...booking,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

connectDB().then(() => {
  app.listen(5000, () => {
    console.log('Server running on port 5000');
  });
});
