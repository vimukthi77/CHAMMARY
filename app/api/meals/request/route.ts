import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import MealPrice from '@/lib/models/MealPrice';
import MealRequest from '@/lib/models/MealRequest';

/** Returns today's date as YYYY-MM-DD in UTC */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── GET: fetch today's existing meal request ──────────────────────────────────
export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const today = todayUTC();
  const request = await MealRequest.findOne({ userId: session.userId, date: today });

  const prices = await MealPrice.findOne();

  return NextResponse.json({ request, prices });
}

// ── POST: upsert today's meal request (server-side price computation) ─────────
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { breakfast, lunch, dinner } = await req.json();

  if (typeof breakfast !== 'boolean' || typeof lunch !== 'boolean' || typeof dinner !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  await connectDB();

  const dbSession = await mongoose.startSession();
  try {
    let result: { request: object | null; balanceAfter: number } | null = null;

    await dbSession.withTransaction(async () => {
      const today = todayUTC();

      // 1. Fetch current meal prices and cutoffs server-side
      const prices = await MealPrice.findOne().session(dbSession);
      if (!prices) throw new Error('Meal prices not configured.');

      const newTotal =
        (breakfast ? prices.breakfastPrice : 0) +
        (lunch ? prices.lunchPrice : 0) +
        (dinner ? prices.dinnerPrice : 0);

      // 2. Fetch user with session lock
      const user = await User.findById(session.userId).session(dbSession);
      if (!user) throw new Error('User not found.');

      // 3. Check for existing request today
      const existing = await MealRequest.findOne({
        userId: session.userId,
        date: today,
      }).session(dbSession);

      // Require selecting at least one meal if no request exists yet
      if (!existing && !breakfast && !lunch && !dinner) {
        throw Object.assign(
          new Error('Please select at least one meal.'),
          { code: 'BAD_REQUEST' }
        );
      }

      // ── Cutoff times validation (IST UTC+5:30) ───────────────────────────
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);
      const hours = istTime.getHours();
      const minutes = istTime.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      const parseTimeToMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const BREAKFAST_LIMIT = parseTimeToMinutes(prices.breakfastCutoff || '07:00');
      const LUNCH_LIMIT = parseTimeToMinutes(prices.lunchCutoff || '10:30');
      const DINNER_LIMIT = parseTimeToMinutes(prices.dinnerCutoff || '18:00');

      const prevBreakfast = existing ? existing.breakfast : false;
      const prevLunch = existing ? existing.lunch : false;
      const prevDinner = existing ? existing.dinner : false;

      if (breakfast !== prevBreakfast && totalMinutes >= BREAKFAST_LIMIT) {
        throw Object.assign(
          new Error(`Breakfast orders cannot be changed after ${prices.breakfastCutoff || '7:00 AM'} IST.`),
          { code: 'CUTOFF_EXCEEDED' }
        );
      }
      if (lunch !== prevLunch && totalMinutes >= LUNCH_LIMIT) {
        throw Object.assign(
          new Error(`Lunch orders cannot be changed after ${prices.lunchCutoff || '10:30 AM'} IST.`),
          { code: 'CUTOFF_EXCEEDED' }
        );
      }
      if (dinner !== prevDinner && totalMinutes >= DINNER_LIMIT) {
        throw Object.assign(
          new Error(`Dinner orders cannot be changed after ${prices.dinnerCutoff || '6:00 PM'} IST.`),
          { code: 'CUTOFF_EXCEEDED' }
        );
      }

      let balanceDiff: number;
      if (existing) {
        // Edit: compute diff from old total
        balanceDiff = newTotal - existing.totalAmount;
      } else {
        balanceDiff = newTotal;
      }

      // 4. Reject if insufficient balance (not applicable if refunding, i.e., balanceDiff < 0)
      const projectedBalance = user.walletBalance - balanceDiff;
      if (projectedBalance < 0) {
        throw Object.assign(
          new Error('Insufficient balance. Please contact the administrator for a top-up.'),
          { code: 'INSUFFICIENT_BALANCE' }
        );
      }

      // 5. Atomically update wallet balance
      await User.updateOne(
        { _id: user._id },
        { $inc: { walletBalance: -balanceDiff } }
      ).session(dbSession);

      // 6. Upsert or delete meal request
      const updatedBalance = projectedBalance;
      let mealRequest = null;
      if (existing) {
        if (!breakfast && !lunch && !dinner) {
          // Refund and delete order completely
          await MealRequest.deleteOne({ _id: existing._id }).session(dbSession);
        } else {
          existing.breakfast = breakfast;
          existing.lunch = lunch;
          existing.dinner = dinner;
          existing.totalAmount = newTotal;
          existing.balanceAfter = updatedBalance;
          await existing.save({ session: dbSession });
          mealRequest = existing;
        }
      } else {
        const [created] = await MealRequest.create(
          [
            {
              userId: session.userId,
              date: today,
              breakfast,
              lunch,
              dinner,
              totalAmount: newTotal,
              balanceAfter: updatedBalance,
            },
          ],
          { session: dbSession }
        );
        mealRequest = created;
      }

      result = { request: mealRequest, balanceAfter: updatedBalance };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    if (error.code === 'BAD_REQUEST') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    if (error.code === 'CUTOFF_EXCEEDED') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[meals/request POST]', err);
    return NextResponse.json({ error: 'Failed to save meal request.' }, { status: 500 });
  } finally {
    dbSession.endSession();
  }
}
