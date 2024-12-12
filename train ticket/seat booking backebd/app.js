const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/seatBooking', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seatSchema = new mongoose.Schema({
  seatNumber: Number,
  rowNumber: Number,
  isBooked: Boolean
});

const Seat = mongoose.model('Seat', seatSchema);

// Initialize Seats
async function initializeSeats() {
  const count = await Seat.countDocuments();
  if (count === 0) {
    const seats = [];
    for (let i = 1; i <= 80; i++) {
        seats.push({ seatNumber: i, rowNumber: Math.ceil(i / 7), isBooked: false });
      }
      seats[79].rowNumber = 12; // Adjust the last row
      await Seat.insertMany(seats);
    }
  }
  initializeSeats();
  
  // Get seat availability
  app.get('/api/seats', async (req, res) => {
    const seats = await Seat.find();
    const rows = Array.from({ length: 12 }, (_, i) =>
      seats.filter((seat) => seat.rowNumber === i + 1)
    );
    res.json(rows);
  });
  
  // Reserve seats
  app.post('/api/reserve', async (req, res) => {
    const { count } = req.body;
    if (count < 1 || count > 7) {
      return res.json({ success: false, message: 'Invalid seat count.' });
    }
  
    const availableSeats = await Seat.find({ isBooked: false });
    const groupedByRow = Array.from({ length: 12 }, (_, i) =>
      availableSeats.filter((seat) => seat.rowNumber === i + 1)
    );
    for (const row of groupedByRow) {
        if (row.length >= count) {
          const bookedSeats = row.slice(0, count);
          await Seat.updateMany(
            { seatNumber: { $in: bookedSeats.map((s) => s.seatNumber) } },
            { $set: { isBooked: true } }
          );
          return res.json({ success: true, bookedSeats: bookedSeats.map((s) => s.seatNumber) });
        }
      }
    
      // Nearest seat allocation
      if (availableSeats.length >= count) {
        const bookedSeats = availableSeats.slice(0, count);
        await Seat.updateMany(
          { seatNumber: { $in: bookedSeats.map((s) => s.seatNumber) } },
          { $set: { isBooked: true } }
        );
        return res.json({ success: true, bookedSeats: bookedSeats.map((s) => s.seatNumber) });
      }
    
      res.json({ success: false, message: 'Not enough seats available.' });
    });
    
    // Start Server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));