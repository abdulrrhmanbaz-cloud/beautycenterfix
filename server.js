require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { readDb, writeDb } = require('./db');
const { sign, requireAdmin } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function cleanString(value) {
  return String(value || '').trim();
}

function validateBooking(body) {
  const errors = [];
  const booking = {
    id: crypto.randomUUID(),
    firstName: cleanString(body.firstName),
    email: cleanString(body.email).toLowerCase(),
    phone: cleanString(body.phone),
    service: cleanString(body.service),
    date: cleanString(body.date),
    time: cleanString(body.time),
    paymentMethod: cleanString(body.paymentMethod),
    description: cleanString(body.description),
    status: 'pending',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!booking.firstName) errors.push({ field: 'firstName', msg: 'Full name is required' });
  if (!/^\S+@\S+\.\S+$/.test(booking.email)) errors.push({ field: 'email', msg: 'Valid email is required' });
  if (booking.phone.length < 8) errors.push({ field: 'phone', msg: 'Valid phone number is required' });
  if (!booking.service) errors.push({ field: 'service', msg: 'Service is required' });
  if (!booking.date) errors.push({ field: 'date', msg: 'Date is required' });
  if (!booking.time) errors.push({ field: 'time', msg: 'Time is required' });
  if (!['instapay', 'cash'].includes(booking.paymentMethod)) errors.push({ field: 'paymentMethod', msg: 'Payment method must be InstaPay or cash' });

  return { booking, errors };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'Luxe Beauty Center API' });
});

app.post('/api/admin/login', (req, res) => {
  const email = cleanString(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxebeauty.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: 'Wrong admin email or password' });
  }

  const token = sign({ role: 'admin', email, exp: Date.now() + 1000 * 60 * 60 * 8 }, process.env.TOKEN_SECRET || 'dev-secret');
  res.json({ token, admin: { email } });
});

app.post('/api/bookings', (req, res) => {
  const { booking, errors } = validateBooking(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const db = readDb();
  const duplicate = db.bookings.find(b => b.date === booking.date && b.time === booking.time && b.status !== 'cancelled');
  if (duplicate) return res.status(409).json({ error: 'This time slot is already booked' });

  db.bookings.unshift(booking);
  writeDb(db);
  res.status(201).json({ message: 'Booking created successfully', booking });
});

app.get('/api/bookings', requireAdmin, (req, res) => {
  const db = readDb();
  const status = cleanString(req.query.status);
  const bookings = status ? db.bookings.filter(b => b.status === status) : db.bookings;
  res.json({ bookings });
});

app.patch('/api/bookings/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (req.body.status && allowedStatuses.includes(req.body.status)) booking.status = req.body.status;
  if (typeof req.body.notes === 'string') booking.notes = cleanString(req.body.notes);
  booking.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json({ message: 'Booking updated', booking });
});

app.delete('/api/bookings/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const before = db.bookings.length;
  db.bookings = db.bookings.filter(b => b.id !== req.params.id);
  if (db.bookings.length === before) return res.status(404).json({ error: 'Booking not found' });
  writeDb(db);
  res.json({ message: 'Booking deleted' });
});

app.get('/api/services', (req, res) => {
  const db = readDb();
  res.json({ services: db.services.filter(s => s.active !== false) });
});

app.post('/api/services', requireAdmin, (req, res) => {
  const db = readDb();
  const service = {
    id: crypto.randomUUID(),
    name: cleanString(req.body.name),
    price: Number(req.body.price || 0),
    active: req.body.active !== false
  };
  if (!service.name || service.price < 0) return res.status(400).json({ error: 'Service name and valid price are required' });
  db.services.push(service);
  writeDb(db);
  res.status(201).json({ service });
});

app.patch('/api/services/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const service = db.services.find(s => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  if (typeof req.body.name === 'string') service.name = cleanString(req.body.name);
  if (req.body.price !== undefined) service.price = Number(req.body.price);
  if (req.body.active !== undefined) service.active = Boolean(req.body.active);
  writeDb(db);
  res.json({ service });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const db = readDb();
  const stats = {
    total: db.bookings.length,
    pending: db.bookings.filter(b => b.status === 'pending').length,
    confirmed: db.bookings.filter(b => b.status === 'confirmed').length,
    completed: db.bookings.filter(b => b.status === 'completed').length,
    cancelled: db.bookings.filter(b => b.status === 'cancelled').length
  };
  res.json({ stats });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Luxe Beauty Center running on http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});
