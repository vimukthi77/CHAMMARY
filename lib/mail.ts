import nodemailer from 'nodemailer';
import { connectDB } from './mongodb';
import EmailLog from './models/EmailLog';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

interface TopUpEmailOptions {
  to: string;
  fullName: string;
  amount: number;
  newBalance: number;
  userId: string;
}

export async function sendTopUpEmail({
  to,
  fullName,
  amount,
  newBalance,
  userId,
}: TopUpEmailOptions): Promise<void> {
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Chammery';
  const subject = 'Your Chammery wallet has been topped up';
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #4E220F; background-color: #F7F1DE; border: 2px solid #D8D2C0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 8px 0 0; color: #4E220F;">Chammery Wallet Top-Up</h1>
      </div>
      
      <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5;">Hi <strong>${fullName}</strong>,</p>
      
      <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #4E220F;">
        Your office meal ordering wallet has been credited with a top-up on <strong>${dateStr}</strong>.
      </p>

      <div style="background-color: #ffffff; border: 2px solid #D8D2C0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #D8D2C0; padding-bottom: 8px;">
          <span style="font-size: 13px; color: #8c9675;">Amount Added:</span>
          <span style="font-size: 14px; font-weight: 700; color: #5f7444;">+Rs.${amount.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: #8c9675;">New Wallet Balance:</span>
          <span style="font-size: 18px; font-weight: 800; color: #4E220F;">Rs.${newBalance.toFixed(2)}</span>
        </div>
      </div>

      <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.5; color: #8c9675; text-align: center;">
        Thank you for using Chammery.
      </p>

      <div style="border-top: 1px solid #D8D2C0; padding-top: 16px; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #8c9675;">Chammery — Office Meal Ordering System</p>
      </div>
    </div>
  `;

  await connectDB();

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    await EmailLog.create({
      userId,
      type: 'topup',
      sentAt: new Date(),
      status: 'sent',
    });
  } catch (err) {
    await EmailLog.create({
      userId,
      type: 'topup',
      sentAt: new Date(),
      status: 'failed',
      error: String(err),
    });
    console.error('[mail] Failed to send top-up email:', err);
  }
}
interface BalanceChangeEmailOptions {
  to: string;
  fullName: string;
  previousBalance: number;
  newBalance: number;
  changedBy: string;
  userId: string;
}

export async function sendBalanceChangeEmail({
  to,
  fullName,
  previousBalance,
  newBalance,
  changedBy,
  userId,
}: BalanceChangeEmailOptions): Promise<void> {
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Chammery';
  const subject = 'Your Chammery wallet balance was updated';
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const delta = newBalance - previousBalance;
  const deltaColor = delta >= 0 ? '#5f7444' : '#b91c1c';
  const deltaText = `${delta >= 0 ? '+' : '-'}Rs.${Math.abs(delta).toFixed(2)}`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #4E220F; background-color: #F7F1DE; border: 2px solid #D8D2C0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 8px 0 0; color: #4E220F;">Wallet Balance Updated</h1>
      </div>

      <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5;">Hi <strong>${fullName}</strong>,</p>

      <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #4E220F;">
        Your Chammery wallet balance was updated by the administrator (<strong>${changedBy}</strong>) on <strong>${dateStr}</strong>.
      </p>

      <div style="background-color: #ffffff; border: 2px solid #D8D2C0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #D8D2C0; padding-bottom: 8px;">
          <span style="font-size: 13px; color: #8c9675;">Previous Balance:</span>
          <span style="font-size: 14px; font-weight: 700; color: #8c9675;">Rs.${previousBalance.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #D8D2C0; padding-bottom: 8px;">
          <span style="font-size: 13px; color: #8c9675;">Change:</span>
          <span style="font-size: 14px; font-weight: 700; color: ${deltaColor};">${deltaText}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: #8c9675;">New Balance:</span>
          <span style="font-size: 18px; font-weight: 800; color: #4E220F;">Rs.${newBalance.toFixed(2)}</span>
        </div>
      </div>

      <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.5; color: #8c9675; text-align: center;">
        If you believe this change is a mistake, please contact the administrator.
      </p>

      <div style="border-top: 1px solid #D8D2C0; padding-top: 16px; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #8c9675;">Chammery — Office Meal Ordering System</p>
      </div>
    </div>
  `;

  await connectDB();

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    await EmailLog.create({
      userId,
      type: 'balance_change',
      sentAt: new Date(),
      status: 'sent',
    });
  } catch (err) {
    await EmailLog.create({
      userId,
      type: 'balance_change',
      sentAt: new Date(),
      status: 'failed',
      error: String(err),
    });
    console.error('[mail] Failed to send balance-change email:', err);
    throw err;
  }
}

export async function sendOtpEmail({
  to,
  fullName,
  otp,
}: {
  to: string;
  fullName: string;
  otp: string;
}): Promise<void> {
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Chammery';
  const subject = 'Your Chammery password reset code';

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #4E220F; background-color: #F7F1DE; border: 2px solid #D8D2C0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 8px 0 0; color: #4E220F;">Password Reset</h1>
      </div>

      <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5;">Hi <strong>${fullName}</strong>,</p>

      <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #4E220F;">
        We received a request to reset your Chammery password. Use the code below. It expires in <strong>10 minutes</strong>.
      </p>

      <div style="background-color: #ffffff; border: 2px solid #D8D2C0; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #8c9675; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
        <p style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4E220F;">${otp}</p>
      </div>

      <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.5; color: #8c9675; text-align: center;">
        If you did not request this, please ignore this email.
      </p>

      <div style="border-top: 1px solid #D8D2C0; padding-top: 16px; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #8c9675;">Chammery — Office Meal Ordering System</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[mail] Failed to send OTP email:', err);
    throw err;
  }
}
