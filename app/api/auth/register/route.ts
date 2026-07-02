import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken, cookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { fullName, employeeId, workEmail, password } = await req.json();

    if (!fullName || !employeeId || !workEmail || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ workEmail: workEmail.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      employeeId,
      workEmail: workEmail.toLowerCase(),
      passwordHash,
      role: 'staff',
    });

    const token = await signToken({
      userId: String(user._id),
      role: 'staff',
      fullName: user.fullName,
      workEmail: user.workEmail,
    });

    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set(cookieOptions(token));
    return res;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
  }
}
