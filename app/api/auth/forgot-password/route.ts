import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sendOtpEmail } from '@/lib/mail';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { workEmail } = await req.json();

    if (!workEmail || typeof workEmail !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ workEmail: workEmail.toLowerCase().trim() }).lean();

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Your account is deactivated. Contact Ajith.' }, { status: 403 });
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('[forgot-password] Writing OTP for user:', user._id, 'OTP:', otp);
    const updateResult = await User.updateOne(
      { _id: user._id },
      { $set: { resetOtp: otp, resetOtpExpiry: expiry } }
    );
    console.log('[forgot-password] updateOne result:', updateResult);

    // Read back to confirm
    const check = await User.findById(user._id).lean();
    console.log('[forgot-password] Read-back resetOtp:', check?.resetOtp);

    await sendOtpEmail({ to: user.workEmail, fullName: user.fullName, otp });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Failed to send reset code. Try again.' }, { status: 500 });
  }
}
