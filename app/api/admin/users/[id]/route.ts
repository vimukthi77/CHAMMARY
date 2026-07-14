import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import MealRequest from '@/lib/models/MealRequest';
import TopUp from '@/lib/models/TopUp';
import { sendBalanceChangeEmail } from '@/lib/mail';

// ── GET: profile view details for a specific user ─────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();

  const user = await User.findById(id).select('-passwordHash').lean();
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // All meal requests for this user
  const mealRequests = await MealRequest.find({ userId: id }).sort({ date: -1 }).lean();

  // Top-up history
  const topups = await TopUp.find({ userId: id }).sort({ createdAt: -1 }).lean();

  // Calculate aggregation stats
  let totalMealsOrdered = 0;
  let totalSpent = 0;

  for (const r of mealRequests) {
    if (r.breakfast) totalMealsOrdered++;
    if (r.lunch) totalMealsOrdered++;
    if (r.dinner) totalMealsOrdered++;
    totalSpent += r.totalAmount;
  }

  return NextResponse.json({
    user,
    mealRequests,
    topups,
    stats: {
      totalMealsOrdered,
      totalSpent,
    },
  });
}

// ── PUT: update user profile (details or active status) ────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { fullName, employeeId, workEmail, isActive, walletBalance } = await req.json();

  await connectDB();

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const previousBalance = user.walletBalance;
  let balanceChanged = false;
  let newBalance = previousBalance;

  if (fullName !== undefined) user.fullName = fullName;
  if (employeeId !== undefined) user.employeeId = employeeId;
  if (workEmail !== undefined) user.workEmail = workEmail.toLowerCase();
  if (isActive !== undefined) user.isActive = isActive;
  if (walletBalance !== undefined) {
    const bal = Number(walletBalance);
    if (Number.isNaN(bal) || bal < 0) {
      return NextResponse.json({ error: 'Wallet balance must be 0 or more.' }, { status: 400 });
    }
    if (bal !== previousBalance) {
      balanceChanged = true;
      newBalance = bal;
    }
    user.walletBalance = bal;
  }

  try {
    await user.save();
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Work email is already taken.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }

  // Notify the user by email when their balance was changed (best-effort).
  let emailSent = false;
  if (balanceChanged) {
    try {
      await sendBalanceChangeEmail({
        to: user.workEmail,
        fullName: user.fullName,
        previousBalance,
        newBalance,
        changedBy: session.fullName ?? 'Admin',
        userId: String(user._id),
      });
      emailSent = true;
    } catch {
      emailSent = false; // email failed but the balance update still succeeded
    }
  }

  return NextResponse.json({
    ok: true,
    user,
    balanceChanged,
    previousBalance,
    newBalance,
    emailSent,
    workEmail: user.workEmail,
  });
}

// ── DELETE: permanently remove a user and their related records ────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Prevent an admin from deleting their own account.
  if (id === session.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Clean up related records so nothing is left orphaned.
  await Promise.all([
    MealRequest.deleteMany({ userId: id }),
    TopUp.deleteMany({ userId: id }),
  ]);
  await User.deleteOne({ _id: id });

  return NextResponse.json({ ok: true });
}

// ── POST: reset password (generates, hashes, returns plain text once) ──────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();

  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  // Generate 8-character temporary password
  const tempPassword = Math.random().toString(36).substring(2, 10);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  user.passwordHash = passwordHash;
  await user.save();

  return NextResponse.json({ ok: true, tempPassword });
}
