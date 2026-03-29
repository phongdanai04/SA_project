const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const uploadsDir = path.join(__dirname, 'uploads');
const activeBookingStatuses = ['pending-confirmation', 'booked', 'checked-in'];

let db;

fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

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
    _id: user._id.toString(),
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

function hasDateOverlap(booking, checkInDate, checkOutDate) {
  return booking.checkInDate < checkOutDate && booking.checkOutDate > checkInDate;
}

async function saveDataUrlToFile(dataUrl, prefix) {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return null;
  }

  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const extension = mimeType.split('/')[1] || 'png';
  const fileName = `${prefix}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.promises.writeFile(filePath, base64Data, 'base64');
  return `/uploads/${fileName}`;
}

async function saveDataUrlsToFiles(dataUrls, prefix) {
  const validDataUrls = Array.isArray(dataUrls) ? dataUrls.filter(Boolean) : [];

  return Promise.all(
    validDataUrls.map((dataUrl, index) => saveDataUrlToFile(dataUrl, `${prefix}-${index + 1}`))
  );
}

async function getUnavailableRoomIds(checkInDate, checkOutDate) {
  const bookings = getCollection('bookings');
  const overlappingBookings = await bookings
    .find({
      status: { $in: activeBookingStatuses },
      checkInDate: { $lt: checkOutDate },
      checkOutDate: { $gt: checkInDate },
    })
    .toArray();

  return new Set(overlappingBookings.map((booking) => booking.roomId).filter(Boolean));
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password || !phone) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบ' });
    }

    const users = getCollection('users');
    const existingUser = await users.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' });
    }

    const newUser = {
      username,
      email,
      password,
      phone,
      role: 'user',
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);
    res.status(201).json({
      message: 'Register successful',
      user: sanitizeUser({ ...newUser, _id: result.insertedId }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/uploads/room-images', async (req, res) => {
  try {
    const { roomNumber, imagesDataUrls } = req.body;

    if (!Array.isArray(imagesDataUrls) || imagesDataUrls.length === 0) {
      return res.status(400).json({ error: 'No room images provided' });
    }

    const uploadedImages = await saveDataUrlsToFiles(
      imagesDataUrls,
      `room-${roomNumber || 'manual'}`
    );

    res.status(201).json({
      images: uploadedImages.filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = getCollection('rooms');
    const bookings = getCollection('bookings');
    const { checkInDate, checkOutDate } = req.query;
    const allRooms = await rooms.find().sort({ roomNumber: 1 }).toArray();
    const bookingList = await bookings
      .find({
        status: { $in: ['pending-confirmation', 'booked', 'checked-in'] },
      })
      .sort({ checkInDate: 1 })
      .toArray();

    const roomsWithBookingPeriods = allRooms.map((room) => {
      const bookedPeriods = bookingList
        .filter((booking) => booking.roomId === room._id.toString())
        .map((booking) => ({
          bookingId: booking._id.toString(),
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          status: booking.status,
          customerName: booking.customerName,
        }));

      return {
        ...room,
        _id: room._id.toString(),
        bookedPeriods,
      };
    });

    if (!checkInDate || !checkOutDate) {
      return res.json(roomsWithBookingPeriods);
    }

    const unavailableRoomIds = await getUnavailableRoomIds(checkInDate, checkOutDate);
    const availableRooms = roomsWithBookingPeriods
      .filter((room) => !unavailableRoomIds.has(room._id.toString()))
      .map((room) => ({
        ...room,
        status: 'available',
      }));

    res.json(availableRooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const rooms = getCollection('rooms');
    const uploadedImages = await saveDataUrlsToFiles(
      req.body.newImagesDataUrls,
      `room-${req.body.roomNumber || 'new'}`
    );
    const newRoom = {
      roomNumber: req.body.roomNumber,
      type: req.body.type,
      price: Number(req.body.price),
      status: req.body.status || 'available',
      images: [...(Array.isArray(req.body.images) ? req.body.images : []), ...uploadedImages].filter(Boolean),
      description: req.body.description || '',
      currentBookingId: null,
      createdAt: new Date(),
    };

    const result = await rooms.insertOne(newRoom);

    res.status(201).json({
      _id: result.insertedId.toString(),
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
    const uploadedImages = await saveDataUrlsToFiles(
      req.body.newImagesDataUrls,
      `room-${roomNumber || req.params.id}`
    );

    if (status !== undefined) updateData.status = status;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (type !== undefined) updateData.type = type;
    if (price !== undefined) updateData.price = Number(price);
    if (description !== undefined) updateData.description = description;
    if (images !== undefined || uploadedImages.length) {
      updateData.images = [...(Array.isArray(images) ? images : []), ...uploadedImages].filter(Boolean);
    }
    if (currentBookingId !== undefined) updateData.currentBookingId = currentBookingId;

    const result = await rooms.updateOne({ _id: roomId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const updatedRoom = await rooms.findOne({ _id: roomId });
    res.json({
      ...updatedRoom,
      _id: updatedRoom._id.toString(),
    });
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
    const payments = getCollection('payments');
    const { userId, role } = req.query;

    const query = {};

    if (role !== 'admin' && userId) {
      query.userId = userId;
    }

    const bookingList = await bookings.find(query).sort({ createdAt: -1 }).toArray();
    const paymentList = await payments.find().toArray();

    const data = bookingList.map((booking) => {
      const payment = paymentList.find(
        (item) =>
          item.bookingId === booking._id.toString() ||
          item.bookingId === booking.bookingId ||
          (Array.isArray(item.bookingIds) && item.bookingIds.includes(booking._id.toString()))
      );

      return {
        ...booking,
        _id: booking._id.toString(),
        paymentStatus: payment?.status || 'unpaid',
        paymentSlip: payment?.paymentSlip || null,
        paymentId: payment?._id?.toString() || null,
      };
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/bookings/:id/checkout', async (req, res) => {
  try {
    const bookingId = toObjectId(req.params.id);

    if (!bookingId) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const bookings = getCollection('bookings');
    const rooms = getCollection('rooms');
    const booking = await bookings.findOne({ _id: bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'ไม่พบรายการจอง' });
    }

    await bookings.updateOne(
      { _id: bookingId },
      {
        $set: {
          status: 'checked-out',
          checkOutTime: new Date().toISOString(),
        },
      }
    );

    if (booking.roomId) {
      const roomObjectId = toObjectId(booking.roomId);

      if (roomObjectId) {
        await rooms.updateOne(
          { _id: roomObjectId },
          {
            $set: {
              status: 'available',
              currentBookingId: null,
            },
          }
        );
      }
    }

    res.json({ message: 'Checkout confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/bookings/:id/checkin', async (req, res) => {
  try {
    const bookingId = toObjectId(req.params.id);

    if (!bookingId) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const bookings = getCollection('bookings');
    const rooms = getCollection('rooms');
    const booking = await bookings.findOne({ _id: bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'ไม่พบรายการจอง' });
    }

    await bookings.updateOne(
      { _id: bookingId },
      {
        $set: {
          status: 'checked-in',
          checkInTime: new Date().toISOString(),
        },
      }
    );

    if (booking.roomId) {
      const roomObjectId = toObjectId(booking.roomId);

      if (roomObjectId) {
        await rooms.updateOne(
          { _id: roomObjectId },
          {
            $set: {
              status: 'occupied',
              currentBookingId: booking._id.toString(),
            },
          }
        );
      }
    }

    res.json({ message: 'Check-in confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const bookingId = toObjectId(req.params.id);

    if (!bookingId) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const bookings = getCollection('bookings');
    const rooms = getCollection('rooms');
    const booking = await bookings.findOne({ _id: bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'ไม่พบรายการจอง' });
    }

    await bookings.updateOne(
      { _id: bookingId },
      {
        $set: {
          status: 'cancelled-no-refund',
          cancelledAt: new Date(),
        },
      }
    );

    if (booking.roomId) {
      const roomObjectId = toObjectId(booking.roomId);

      if (roomObjectId) {
        await rooms.updateOne(
          { _id: roomObjectId, currentBookingId: booking._id.toString() },
          {
            $set: {
              status: 'available',
              currentBookingId: null,
            },
          }
        );
      }
    }

    res.json({ message: 'Booking cancelled without refund' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    const payments = getCollection('payments');
    const bookings = getCollection('bookings');
    const { role, userId } = req.query;

    const paymentList = await payments.find().sort({ createdAt: -1 }).toArray();

    if (role === 'admin') {
      return res.json(
        paymentList.map((payment) => ({
          ...payment,
          _id: payment._id.toString(),
        }))
      );
    }

    const bookingList = await bookings.find({ userId }).toArray();
    const bookingIdSet = new Set(bookingList.map((booking) => booking._id.toString()));
    const userPayments = paymentList.filter((payment) => bookingIdSet.has(payment.bookingId));

    res.json(
      userPayments.map((payment) => ({
        ...payment,
        _id: payment._id.toString(),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/submit', async (req, res) => {
  try {
    const {
      userId,
      roomId,
      roomIds,
      customerName,
      email,
      phone,
      checkInDate,
      checkOutDate,
      checkInTime,
      paymentMethod,
      slipDataUrl,
    } = req.body;

    const selectedRoomIds = Array.isArray(roomIds) && roomIds.length ? roomIds : roomId ? [roomId] : [];

    if (!selectedRoomIds.length || !customerName || !checkInDate || !checkOutDate || !slipDataUrl) {
      return res.status(400).json({ error: 'ข้อมูลการจองและการชำระเงินไม่ครบ' });
    }

    const rooms = getCollection('rooms');
    const bookings = getCollection('bookings');
    const payments = getCollection('payments');

    const unavailableRoomIds = await getUnavailableRoomIds(checkInDate, checkOutDate);
    const totalNights = calculateNights(checkInDate, checkOutDate);

    if (totalNights <= 0) {
      return res.status(400).json({ error: 'วันเข้าพักและวันออกไม่ถูกต้อง' });
    }

    const selectedRooms = [];

    for (const selectedRoomId of selectedRoomIds) {
      const roomObjectId = toObjectId(selectedRoomId);

      if (!roomObjectId) {
        return res.status(400).json({ error: 'Invalid room id' });
      }

      if (unavailableRoomIds.has(selectedRoomId)) {
        return res.status(409).json({ error: 'มีบางห้องไม่ว่างในช่วงวันที่เลือกแล้ว' });
      }

      const room = await rooms.findOne({ _id: roomObjectId });

      if (!room) {
        return res.status(404).json({ error: 'ไม่พบห้องพักที่ต้องการจอง' });
      }

      selectedRooms.push({
        ...room,
        _id: room._id.toString(),
      });
    }

    const bookingResults = [];
    let grandTotal = 0;

    for (const room of selectedRooms) {
      const totalPrice = room.price * totalNights;
      grandTotal += totalPrice;

      const booking = {
        userId: userId || null,
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomType: room.type,
        customerName,
        email: email || null,
        phone: phone || null,
        checkInDate,
        checkOutDate,
        checkInTime: checkInTime || null,
        checkOutTime: null,
        pricePerNight: room.price,
        totalNights,
        totalPrice,
        promotionId: null,
        finalPrice: totalPrice,
        depositAmount: Math.ceil(totalPrice * 0.25),
        status: 'pending-confirmation',
        createdAt: new Date(),
      };

      const bookingResult = await bookings.insertOne(booking);
      bookingResults.push({
        ...booking,
        _id: bookingResult.insertedId.toString(),
      });

      await rooms.updateOne(
        { _id: toObjectId(room._id) },
        {
          $set: {
            status: 'booked',
            currentBookingId: bookingResult.insertedId.toString(),
          },
        }
      );
    }

    const depositAmount = Math.ceil(grandTotal * 0.25);
    const paymentSlip = await saveDataUrlToFile(slipDataUrl, 'payment-slip');

    const payment = {
      bookingId: bookingResults[0]._id,
      bookingIds: bookingResults.map((booking) => booking._id),
      amount: depositAmount,
      totalAmount: grandTotal,
      method: paymentMethod || 'transfer',
      status: 'pending',
      paymentSlip,
      paidAt: new Date(),
      verifiedBy: null,
      createdAt: new Date(),
    };

    const paymentResult = await payments.insertOne(payment);

    res.status(201).json({
      message: 'Payment submitted',
      bookings: bookingResults,
      payment: {
        ...payment,
        _id: paymentResult.insertedId.toString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/payments/:id/approve', async (req, res) => {
  try {
    const paymentId = toObjectId(req.params.id);
    const { adminName } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Invalid payment id' });
    }

    const payments = getCollection('payments');
    const bookings = getCollection('bookings');
    const rooms = getCollection('rooms');

    const payment = await payments.findOne({ _id: paymentId });

    if (!payment) {
      return res.status(404).json({ error: 'ไม่พบรายการชำระเงิน' });
    }

    const relatedBookingIds = Array.isArray(payment.bookingIds) && payment.bookingIds.length
      ? payment.bookingIds
      : payment.bookingId
        ? [payment.bookingId]
        : [];

    await payments.updateOne(
      { _id: paymentId },
      {
        $set: {
          status: 'approved',
          verifiedBy: adminName || null,
        },
      }
    );

    for (const relatedBookingId of relatedBookingIds) {
      const bookingId = toObjectId(relatedBookingId);
      const booking = bookingId ? await bookings.findOne({ _id: bookingId }) : null;

      if (!bookingId || !booking) {
        continue;
      }

      await bookings.updateOne(
        { _id: bookingId },
        {
          $set: {
            status: 'booked',
          },
        }
      );

      const roomObjectId = toObjectId(booking.roomId);

      if (roomObjectId) {
        await rooms.updateOne(
          { _id: roomObjectId },
          {
            $set: {
              status: 'booked',
              currentBookingId: booking._id.toString(),
            },
          }
        );
      }
    }

    res.json({ message: 'Booking confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

connectDB().then(() => {
  app.listen(5000, () => {
    console.log('Server running on port 5000');
  });
});
