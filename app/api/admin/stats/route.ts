import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import MealRequest from '@/lib/models/MealRequest';
import TopUp from '@/lib/models/TopUp';

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = new Date().toISOString().slice(0, 7);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 1. Total users
  const totalUsers = await User.countDocuments({ role: 'staff' });

  // 2. Sum of all wallet balances
  const sumBalances = await User.aggregate([
    { $match: { role: 'staff' } },
    { $group: { _id: null, total: { $sum: '$walletBalance' } } },
  ]);
  const totalWalletBalance = sumBalances[0]?.total ?? 0;

  // 3. Today's order stats
  const todayStats = await MealRequest.aggregate([
    { $match: { date: todayStr } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        breakfastCount: { $sum: { $cond: ['$breakfast', 1, 0] } },
        lunchCount: { $sum: { $cond: ['$lunch', 1, 0] } },
        dinnerCount: { $sum: { $cond: ['$dinner', 1, 0] } },
        todayIncome: { $sum: '$totalAmount' },
      },
    },
  ]);

  const todayStatsData = todayStats[0] ?? {
    totalOrders: 0,
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 0,
    todayIncome: 0,
  };

  // 4. This month's income
  const monthStats = await MealRequest.aggregate([
    { $match: { date: { $regex: `^${monthPrefix}` } } },
    { $group: { _id: null, totalIncome: { $sum: '$totalAmount' } } },
  ]);
  const monthIncome = monthStats[0]?.totalIncome ?? 0;

  // 5. Total top-ups this month
  const topupStats = await TopUp.aggregate([
    { $match: { createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, totalTopups: { $sum: '$amount' } } },
  ]);
  const totalTopupsThisMonth = topupStats[0]?.totalTopups ?? 0;

  return NextResponse.json({
    totalUsers,
    totalWalletBalance,
    todayOrders: todayStatsData.totalOrders,
    breakfastCount: todayStatsData.breakfastCount,
    lunchCount: todayStatsData.lunchCount,
    dinnerCount: todayStatsData.dinnerCount,
    todayIncome: todayStatsData.todayIncome,
    monthIncome,
    totalTopupsThisMonth,
  });
}
