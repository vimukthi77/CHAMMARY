import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import MealRequest from '@/lib/models/MealRequest';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  await connectDB();

  // Find all requests for this date and populate User details
  const requests = await MealRequest.find({ date })
    .populate('userId', 'fullName employeeId workEmail')
    .lean();

  return NextResponse.json({ requests, date });
}
