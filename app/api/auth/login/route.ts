import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken, cookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { workEmail, username, password } = await req.json();
    const identifier = workEmail || username;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/Employee ID and password are required.' }, { status: 400 });
    }

    await connectDB();

    // Accept username/employeeId or workEmail
    const user = await User.findOne({
      $or: [
        { workEmail: identifier.toLowerCase() },
        { employeeId: identifier },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact Ajith.' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const token = await signToken({
      userId: String(user._id),
      role: user.role,
      fullName: user.fullName,
      workEmail: user.workEmail,
    });

    const res = NextResponse.json({ ok: true, role: user.role }, { status: 200 });
    res.cookies.set(cookieOptions(token));
    return res;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}
