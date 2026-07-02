'use client';

import { useState, FormEvent, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [workEmail, setWorkEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: send OTP
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send code.');
        return;
      }
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workEmail }),
      });
    } finally {
      setResending(false);
    }
  }

  // Step 2: verify OTP
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    // Just move to password step — actual verification happens on submit
    setError('');
    setStep('password');
  }

  // Step 3: reset password
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workEmail, otp: otp.join(''), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Reset failed.');
        if (data.error?.toLowerCase().includes('expired')) {
          setStep('otp');
          setOtp(['', '', '', '', '', '']);
        }
        return;
      }
      setStep('done');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-[var(--background)]">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
            {step === 'done' ? 'Password Updated' : 'Reset Password'}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-semibold">
            {step === 'email' && 'Enter your email to receive a reset code'}
            {step === 'otp' && `Code sent to ${workEmail}`}
            {step === 'password' && 'Create your new password'}
            {step === 'done' && 'Your password has been changed successfully'}
          </p>
        </div>

        <div className="bg-[var(--card)] rounded-2xl shadow-sm border-2 border-[var(--border)] p-6">

          {/* Step indicator dots */}
          {step !== 'done' && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? 'w-8 bg-[var(--foreground)]' : 
                    ['email', 'otp', 'password'].indexOf(step) > i ? 'w-4 bg-[var(--accent)]' : 
                    'w-4 bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-bold text-center">
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5" htmlFor="fp-email">
                  Work Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                />
              </div>
              <button
                id="fp-send-otp-btn"
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)] disabled:opacity-60"
              >
                {loading ? 'Sending code…' : 'Send reset code'}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-3 text-center">
                  Enter 6-digit code
                </label>
                <div className="flex items-center justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      id={`otp-digit-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-14 text-center text-xl font-extrabold rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                    />
                  ))}
                </div>
              </div>

              <button
                id="fp-verify-otp-btn"
                type="submit"
                className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)]"
              >
                Verify Code
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] font-semibold transition-colors disabled:opacity-50"
                >
                  {resending ? 'Resending…' : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5" htmlFor="fp-new-password">
                  New Password
                </label>
                <input
                  id="fp-new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5" htmlFor="fp-confirm-password">
                  Confirm Password
                </label>
                <input
                  id="fp-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                />
              </div>
              <button
                id="fp-reset-btn"
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)] disabled:opacity-60"
              >
                {loading ? 'Updating password…' : 'Set new password'}
              </button>
            </form>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-[var(--muted)] font-semibold">
                You can now sign in with your new password.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)]"
              >
                Go to Sign In
              </button>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <p className="text-center text-sm text-[var(--muted)] font-semibold mt-5">
            Remember your password?{' '}
            <Link href="/login" className="text-[var(--foreground)] font-extrabold hover:underline">
              Sign in
            </Link>
          </p>
        )}

        <p className="text-center text-[10px] text-[var(--muted)]/60 font-medium mt-6 tracking-wide">
          Crafted by EPC IT Team
        </p>
      </div>
    </main>
  );
}
