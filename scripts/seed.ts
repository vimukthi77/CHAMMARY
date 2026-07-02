/**
 * Chammery seed script — run once after first deploy.
 * Usage: npm run seed
 *
 * Prerequisites: create .env.local with MONGODB_URI, ADMIN_USERNAME, ADMIN_PASSWORD_HASH
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'ajith';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!;

if (!MONGODB_URI || !ADMIN_PASSWORD_HASH) {
  console.error('❌ MONGODB_URI and ADMIN_PASSWORD_HASH must be set in .env.local');
  process.exit(1);
}

// Inline schemas (avoid Next.js module caching issues in ts-node context)
const UserSchema = new mongoose.Schema({
  fullName: String,
  employeeId: String,
  workEmail: { type: String, unique: true },
  passwordHash: String,
  walletBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  role: { type: String, default: 'staff' },
}, { timestamps: { createdAt: true, updatedAt: false } });

const MealPriceSchema = new mongoose.Schema({
  breakfastPrice: Number,
  lunchPrice: Number,
  dinnerPrice: Number,
  breakfastCutoff: { type: String, default: '07:00' },
  lunchCutoff: { type: String, default: '10:30' },
  dinnerCutoff: { type: String, default: '18:00' },
}, { timestamps: { createdAt: false, updatedAt: true } });

async function seed() {
  console.log('🌱 Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.models.User ?? mongoose.model('User', UserSchema);
  const MealPrice = mongoose.models.MealPrice ?? mongoose.model('MealPrice', MealPriceSchema);

  // ── Upsert admin user ─────────────────────────────────────────────────────
  const adminEmail = `${ADMIN_USERNAME}@chammery.internal`;
  const adminUser = await User.findOneAndUpdate(
    { workEmail: adminEmail },
    {
      fullName: 'Ajith',
      employeeId: 'ADMIN001',
      workEmail: adminEmail,
      passwordHash: ADMIN_PASSWORD_HASH,
      role: 'admin',
      isActive: true,
      walletBalance: 0,
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Admin user upserted: ${adminUser.workEmail} (role: admin)`);

  // ── Upsert default meal prices ─────────────────────────────────────────────
  const prices = await MealPrice.findOneAndUpdate(
    {},
    { 
      breakfastPrice: 150, 
      lunchPrice: 350, 
      dinnerPrice: 250,
      breakfastCutoff: '07:00',
      lunchCutoff: '10:30',
      dinnerCutoff: '18:00'
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Meal prices set: B=₹${prices.breakfastPrice} L=₹${prices.lunchPrice} D=₹${prices.dinnerPrice}`);

  await mongoose.disconnect();
  console.log('🎉 Seed complete. Admin login email:', adminEmail);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
