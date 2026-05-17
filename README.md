# Luxe Beauty Center — Full-Stack Website

This project includes your beauty center front end, a Node.js/Express backend, booking storage, and an admin dashboard.

## What is included

- Public website: `/public/index.html`
- Admin dashboard: `/public/admin.html`
- Backend API: `/server/server.js`
- Local JSON database: `/data/db.json`
- Booking API, admin login, booking status updates, delete booking, and service API.

## How to run

1. Install Node.js.
2. Open the project folder in VS Code or terminal.
3. Run:

```bash
npm install
npm start
```

4. Open:

```text
http://localhost:5001
```

5. Admin dashboard:

```text
http://localhost:5001/admin
```

## Default admin login

```text
Email: admin@luxebeauty.com
Password: admin123
```

Before publishing online, copy `.env.example` to `.env` and change the password and token secret.

## Important files

- `public/index.html`: your front end. I changed the API connection from `http://localhost:5001/api` to `/api` so it works locally and online.
- `server/server.js`: all backend routes.
- `data/db.json`: stores bookings and services.

## API routes

Public:

- `POST /api/bookings` — create a booking
- `GET /api/services` — get service list
- `GET /api/health` — test server

Admin:

- `POST /api/admin/login` — admin login
- `GET /api/admin/stats` — dashboard statistics
- `GET /api/bookings` — list bookings
- `PATCH /api/bookings/:id` — update booking status/notes
- `DELETE /api/bookings/:id` — delete booking
- `POST /api/services` — add service
- `PATCH /api/services/:id` — update service

## Suggested next upgrades

- Replace JSON database with MongoDB or PostgreSQL for real production use.
- Add email/WhatsApp notification after each booking.
- Add image upload for gallery.
- Add online payment integration.
