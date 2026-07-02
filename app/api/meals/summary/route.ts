import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import MealRequest from '@/lib/models/MealRequest';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // Find requests in current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}`; // YYYY-MM

  const requests = await MealRequest.find({
    userId: session.userId,
    date: { $regex: `^${monthPrefix}` },
  }).lean();

  let breakfastCount = 0;
  let lunchCount = 0;
  let dinnerCount = 0;
  let totalSpent = 0;

  for (const r of requests) {
    if (r.breakfast) breakfastCount++;
    if (r.lunch) lunchCount++;
    if (r.dinner) dinnerCount++;
    totalSpent += r.totalAmount;
  }

  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return NextResponse.json({
    monthLabel,
    breakfastCount,
    lunchCount,
    dinnerCount,
    totalSpent,
    totalOrders: requests.length,
  });
}
