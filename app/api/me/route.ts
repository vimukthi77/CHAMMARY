import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.userId).select(
    'fullName workEmail employeeId walletBalance role'
  );
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    fullName: user.fullName,
    workEmail: user.workEmail,
    employeeId: user.employeeId,
    walletBalance: user.walletBalance,
    role: user.role,
  });
}
