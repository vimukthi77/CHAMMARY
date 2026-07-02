import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateRegistrationOptions } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const host = req.headers.get('host') || '';
  const rpID = host.split(':')[0] || 'localhost';

  const options = await generateRegistrationOptions({
    rpName: 'Chammery Office Meals',
    rpID,
    userID: new Uint8Array(Buffer.from(String(user._id))),
    userName: user.workEmail,
    userDisplayName: user.fullName,
    excludeCredentials: (user.passkeys || []).map((pk) => ({
      id: pk.credentialID,
      type: 'public-key',
    })),
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'discouraged',
    },
  });

  // Save challenge directly to user document in DB to bypass schema cache issues
  console.log('[webauthn register-options] Setting challenge for user:', user._id, 'Challenge:', options.challenge);
  const updateResult = await User.updateOne({ _id: user._id }, { $set: { currentChallenge: options.challenge } });
  console.log('[webauthn register-options] updateOne result:', updateResult);

  // Read back to verify
  const verifiedUser = await User.findById(user._id).lean();
  console.log('[webauthn register-options] Read back user currentChallenge:', verifiedUser?.currentChallenge);

  return NextResponse.json(options);
}
