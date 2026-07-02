import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { signToken, cookieOptions } from '@/lib/auth';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  try {
    const { workEmail, credentialResponse } = await req.json();

    if (!workEmail || !credentialResponse) {
      return NextResponse.json({ error: 'Email and biometric credentials are required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ workEmail: workEmail.toLowerCase().trim() }).lean();
    if (!user || !user.currentChallenge) {
      return NextResponse.json({ error: 'Authentication session not found or challenge missing' }, { status: 400 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Your account has been deactivated. Contact Ajith.' }, { status: 403 });
    }

    const passkeyIndex = (user.passkeys || []).findIndex((pk) => pk.credentialID === credentialResponse.id);
    if (passkeyIndex === -1) {
      return NextResponse.json({ error: 'Biometric credential not recognized for this account' }, { status: 400 });
    }

    const passkey = user.passkeys[passkeyIndex];

    const host = req.headers.get('host') || '';
    const rpID = host.split(':')[0] || 'localhost';
    const origin = `${host.includes('localhost') ? 'http' : 'https'}://${host}`;

    const verification = await verifyAuthenticationResponse({
      response: credentialResponse,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
        counter: passkey.counter,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      const updatedPasskeys = [...(user.passkeys || [])];
      updatedPasskeys[passkeyIndex].counter = verification.authenticationInfo.newCounter;

      await User.updateOne(
        { _id: user._id },
        {
          $set: { passkeys: updatedPasskeys },
          $unset: { currentChallenge: '' }
        }
      );

      // Sign token
      const token = await signToken({
        userId: String(user._id),
        role: user.role,
        fullName: user.fullName,
        workEmail: user.workEmail,
      });

      const res = NextResponse.json({ ok: true, role: user.role }, { status: 200 });
      res.cookies.set(cookieOptions(token));
      return res;
    } else {
      return NextResponse.json({ error: 'Biometric verification failed' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Biometric verification error:', err);
    return NextResponse.json({ error: err.message || 'Verification crashed' }, { status: 500 });
  }
}
