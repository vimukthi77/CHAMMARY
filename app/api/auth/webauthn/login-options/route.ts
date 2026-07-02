import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  try {
    const { workEmail } = await req.json();
    if (!workEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ workEmail: workEmail.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.passkeys || user.passkeys.length === 0) {
      return NextResponse.json({ error: 'No biometric credentials registered for this email.' }, { status: 400 });
    }

    const host = req.headers.get('host') || '';
    const rpID = host.split(':')[0] || 'localhost';

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: (user.passkeys || []).map((pk) => ({
        id: pk.credentialID,
        transports: pk.transports as any[],
      })),
      userVerification: 'preferred',
    });

    // Save challenge directly to DB to bypass cache issues
    await User.updateOne({ _id: user._id }, { $set: { currentChallenge: options.challenge } });

    return NextResponse.json(options);
  } catch (err: any) {
    console.error('Login options error:', err);
    return NextResponse.json({ error: err.message || 'Crashed' }, { status: 500 });
  }
}
