import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import MealRequest from '@/lib/models/MealRequest';

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  await connectDB();
  const count = await MealRequest.countDocuments({ date });

  return NextResponse.json({ count, date });
}
