# Chammery — Office Meal Ordering System

A minimal, mobile-first meal ordering app for an office. Staff order breakfast, lunch, and dinner daily; Ajith manages wallets and prices from the admin panel.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB Atlas via Mongoose
- **Auth**: Custom JWT (httpOnly cookies) + bcrypt
- **Email**: Nodemailer + Gmail SMTP

---

## Getting Started

### 1. Clone & install

```bash
cd d:\CHAMMARY
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random 32+ char string (use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `EMAIL_USER` | Gmail address |
| `EMAIL_APP_PASSWORD` | 16-char Gmail App Password |
| `EMAIL_FROM_NAME` | Display name for emails (default: `Chammery`) |
| `ADMIN_USERNAME` | Admin login username (default: `ajith`) |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password (see below) |

### 3. Generate admin password hash

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD',12).then(h=>console.log(h))"
```

Copy the output into `ADMIN_PASSWORD_HASH` in `.env.local`.

### 4. Seed the database

```bash
npm run seed
```

This creates the admin user and sets default meal prices. Safe to re-run.

**Admin login email**: `ajith@chammery.internal`

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Business Rules (enforced server-side)

- **One order per day**: Unique DB index on `(userId, date)`. Editing recalculates wallet diff atomically.
- **Server-side pricing**: Prices always read from DB — client-sent prices ignored.
- **Insufficient balance**: Rejected with HTTP 402 and descriptive message.
- **Atomic transactions**: Mongoose sessions ensure wallet + order records written together.
- **Top-up email**: Sent via Gmail SMTP after successful top-up. Email failure logged but does not roll back the top-up.

---

## Default Meal Prices (editable in admin panel)

| Meal | Default |
|---|---|
| Breakfast | 50 |
| Lunch | 80 |
| Dinner | 70 |
