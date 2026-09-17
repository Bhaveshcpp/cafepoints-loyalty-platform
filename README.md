# CafePoints — Full-Stack Loyalty Platform

CafePoints is a polished MERN loyalty platform for cafés. It combines a staff POS counter, customer portal, QR redemption, loyalty tiers, rewards, member CRM and an admin control center.

## Features

- Staff/admin authentication with JWT + HTTP-only cookies
- Customer lookup and instant enrollment by phone
- Purchase-based loyalty points with Bronze/Silver/Gold multipliers
- Persistent MongoDB transaction ledger
- Reward catalog and one-click redemption
- Customer-facing loyalty portal
- Referral codes with bonus points
- Single-use, short-lived redemption QR codes
- Staff camera/manual QR verification
- Member search, pagination, edit and delete
- Admin KPIs for members, issued/redeemed points and redemptions
- Staff/admin account management
- Responsive mobile-first UI
- Docker-ready project structure

## Stack

**Frontend:** React 18, Vite, React Router, Axios, Lucide, QRCode, html5-qrcode

**Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcrypt

## Run locally

### Backend

```bash
cd backend
cp .env.sample .env
npm install
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite app runs on port 5173 by default. Configure `CLIENT_ORIGIN` and the Vite proxy if your API is on a different port.

### Demo accounts

- Admin: `admin@demo.local` / `password123`
- Staff: `staff@demo.local` / `password123`

Demo member phones:

- `9000000001`
- `9000000002`
- `9000000003`

## Environment

See `backend/.env.sample`. Use a MongoDB Atlas connection string for transactions in production. For local MongoDB transactions, use a replica set configuration.

## Production notes

The customer portal is intentionally phone-based for this portfolio/demo implementation. A production deployment should add OTP/password authentication for customers, CSRF protection, audit logging, stronger validation and a proper tenant/shop model.


## Loyalty automation endpoints
- `POST /clock` (or `/api/clock`) accepts `{ "now": "ISO_DATE" }` and expires unused point lots older than 90 days.
- `GET /outbox` (or `/api/outbox`) returns pending tier-change notification events.
- `POST /outbox/:id/ack` acknowledges an outbox event.

## Tier rules
Bronze: 0+, Silver: 500+, Gold: 1500+, Platinum: 5000+. Platinum earns 0.3 points per ₹; existing tiers are derived from lifetime points.
