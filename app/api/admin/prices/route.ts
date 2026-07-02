import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import MealPrice from '@/lib/models/MealPrice';

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const prices = await MealPrice.findOne();
  return NextResponse.json({ prices });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { 
    breakfastPrice, 
    lunchPrice, 
    dinnerPrice,
    breakfastCutoff,
    lunchCutoff,
    dinnerCutoff
  } = await req.json();

  if (
    typeof breakfastPrice !== 'number' ||
    typeof lunchPrice !== 'number' ||
    typeof dinnerPrice !== 'number' ||
    breakfastPrice < 0 ||
    lunchPrice < 0 ||
    dinnerPrice < 0
  ) {
    return NextResponse.json({ error: 'All prices must be non-negative numbers.' }, { status: 400 });
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (
    typeof breakfastCutoff !== 'string' ||
    typeof lunchCutoff !== 'string' ||
    typeof dinnerCutoff !== 'string' ||
    !timeRegex.test(breakfastCutoff) ||
    !timeRegex.test(lunchCutoff) ||
    !timeRegex.test(dinnerCutoff)
  ) {
    return NextResponse.json({ error: 'All cutoffs must be in HH:MM format.' }, { status: 400 });
  }

  await connectDB();
  const prices = await MealPrice.findOneAndUpdate(
    {},
    { 
      breakfastPrice, 
      lunchPrice, 
      dinnerPrice, 
      breakfastCutoff,
      lunchCutoff,
      dinnerCutoff,
      updatedAt: new Date() 
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, prices });
}
