import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { workEmail, otp, newPassword } = await req.json();

    if (!workEmail || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    await connectDB();

    // Use lean() to bypass Mongoose schema caching — ensures new fields are always read from MongoDB
    const user = await User.findOne({ workEmail: workEmail.toLowerCase().trim() }).lean();
    console.log('[reset-password] user found:', !!user, 'resetOtp:', user?.resetOtp, 'expiry:', user?.resetOtpExpiry);

    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return NextResponse.json({ error: 'Invalid or expired reset code.' }, { status: 400 });
    }

    if (user.resetOtp !== otp.trim()) {
      console.log('[reset-password] OTP mismatch. Received:', otp.trim(), 'Expected:', user.resetOtp);
      return NextResponse.json({ error: 'Incorrect verification code.' }, { status: 400 });
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      await User.updateOne({ _id: user._id }, { $unset: { resetOtp: '', resetOtpExpiry: '' } });
      return NextResponse.json({ error: 'Verification code has expired. Request a new one.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash },
        $unset: { resetOtp: '', resetOtpExpiry: '' },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Failed to reset password. Try again.' }, { status: 500 });
  }
}
