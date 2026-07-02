import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  await connectDB();
  const user = await User.findById(session.userId).lean();
  console.log('[webauthn register-verify] Loaded user:', session.userId, 'currentChallenge:', user?.currentChallenge);
  if (!user || !user.currentChallenge) {
    return NextResponse.json({ error: 'Registration session not found or challenge missing' }, { status: 400 });
  }

  const host = req.headers.get('host') || '';
  const rpID = host.split(':')[0] || 'localhost';
  const origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { id, publicKey, counter, transports } = verification.registrationInfo.credential;

      const passkeys = user.passkeys || [];
      passkeys.push({
        credentialID: id,
        publicKey: Buffer.from(publicKey).toString('base64url'),
        counter,
        transports: transports || body.response?.transports,
      });

      // Update directly via MongoDB driver bypass schema caching
      await User.updateOne(
        { _id: user._id },
        {
          $set: { passkeys },
          $unset: { currentChallenge: '' }
        }
      );

      return NextResponse.json({ verified: true });
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Registration verification failed:', err);
    return NextResponse.json({ error: err.message || 'Verification crashed' }, { status: 500 });
  }
}
