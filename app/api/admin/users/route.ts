import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') ?? '';

  await connectDB();

  const query = search
    ? {
        role: 'staff',
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { workEmail: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
        ],
      }
    : { role: 'staff' };

  const users = await User.find(query)
    .select('fullName workEmail employeeId walletBalance isActive createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}
