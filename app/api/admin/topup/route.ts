import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TopUp from '@/lib/models/TopUp';
import { sendTopUpEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, amount } = await req.json();

  if (!userId || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Valid userId and positive amount required.' }, { status: 400 });
  }

  await connectDB();

  const dbSession = await mongoose.startSession();
  let newBalance = 0;
  let targetUser: { fullName: string; workEmail: string } | null = null;

  try {
    await dbSession.withTransaction(async () => {
      // Atomically increment wallet balance
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { walletBalance: amount } },
        { new: true, session: dbSession }
      );

      if (!updatedUser) throw new Error('User not found.');

      newBalance = updatedUser.walletBalance;
      targetUser = { fullName: updatedUser.fullName, workEmail: updatedUser.workEmail };

      // Write audit record
      await TopUp.create(
        [
          {
            userId,
            amount,
            balanceAfter: newBalance,
            addedBy: session.fullName ?? 'Ajith',
          },
        ],
        { session: dbSession }
      );
    });

    // Send email outside transaction (non-blocking failure)
    if (targetUser) {
      await sendTopUpEmail({
        to: (targetUser as { workEmail: string }).workEmail,
        fullName: (targetUser as { fullName: string }).fullName,
        amount,
        newBalance,
        userId,
      });
    }

    return NextResponse.json({ ok: true, newBalance });
  } catch (err) {
    console.error('[topup]', err);
    return NextResponse.json({ error: 'Top-up failed.' }, { status: 500 });
  } finally {
    dbSession.endSession();
  }
}
