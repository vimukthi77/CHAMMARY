'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  // Use a full-page navigation after login instead of router.push. On older
  // iOS Safari (e.g. iOS 15.x), a cookie set on a fetch() response is committed
  // to the cookie jar asynchronously; a client-side router.push can race ahead
  // of it, so middleware sees no session and bounces back to /login (looks like
  // the page "refreshed" and cleared the form). A hard navigation issues a real
  // document request that reliably carries the freshly-set session cookie.
  function goToDashboard(role?: string) {
    window.location.assign(role === 'admin' ? '/admin' : '/dashboard');
  }

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // WebAuthn biometric state
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricEmail, setBiometricEmail] = useState('');
  const [biometricUserName, setBiometricUserName] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricsLink, setShowBiometricsLink] = useState(false);

  useEffect(() => {
    // NOTE: iOS Safari with "Block All Cookies" / Private Browsing throws on
    // localStorage access. Guard it so the login form still renders and works.
    let registered = false;
    let email = '';
    let name = '';
    try {
      registered = localStorage.getItem('has_biometrics_registered') === 'true';
      email = localStorage.getItem('biometric_email') || '';
      name = localStorage.getItem('biometric_user_name') || '';
    } catch {
      // Storage blocked by browser settings — fall back to password login.
    }
    if (registered && email) {
      setHasBiometric(true);
      setBiometricEmail(email);
      setBiometricUserName(name);
      setShowBiometricsLink(true);
      // Removed auto-trigger on mount. User needs to tap the button to satisfy user-gesture security.
    } else if (registered) {
      setShowBiometricsLink(true);
    }
  }, []);

  async function handleBiometricLogin(emailToUse?: string) {
    const targetEmail = emailToUse || biometricEmail;
    if (!targetEmail) {
      setError('Please enter your email to login with biometrics.');
      return;
    }

    setBiometricLoading(true);
    setError('');
    try {
      const optionsRes = await fetch('/api/auth/webauthn/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workEmail: targetEmail }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        throw new Error(options.error || 'Failed to fetch biometric login options.');
      }

      const { startAuthentication } = await import('@simplewebauthn/browser');
      const authResponse = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workEmail: targetEmail,
          credentialResponse: authResponse,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Biometric verification failed.');
      }

      goToDashboard(verifyData.role);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Biometric verification failed or was cancelled.');
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workEmail: identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed.');
        return;
      }

      goToDashboard(data.role);
      return;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col md:flex-row bg-[var(--background)]">
      {/* Decorative Food Image Hero Panel (Hidden on mobile stack, visible on md+) */}
      <div 
        className="hidden md:flex md:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000')` }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white h-full max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight">Chammery</h1>
          <p className="text-lg text-slate-200 mt-2 font-medium">
            Prepaid office meal orders in seconds. Simple, transparent, and accurate.
          </p>
        </div>
      </div>

      {/* Login Credentials Box */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          {/* Brand header for mobile */}
          <div className="text-center md:text-left mb-8">
            {/* Small food-themed header banner for mobile */}
            <div 
              className="md:hidden w-full h-32 rounded-2xl bg-cover bg-center mb-6 shadow-inner relative overflow-hidden"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=600')` }}
            >
              <div className="absolute inset-0 bg-black/35" />
              <div className="absolute bottom-4 left-4 text-white">
                <h2 className="text-xl font-bold">Chammery</h2>
              </div>
            </div>
            
            <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Welcome back</h1>
            <p className="text-sm text-[var(--muted)] mt-1 font-semibold">Sign in to check balance and order meals</p>
          </div>

          <div className="bg-[var(--card)] rounded-2xl shadow-sm border-2 border-[var(--border)] p-6">
            {error && (
              <div className="mb-4 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-bold text-center">
                {error}
              </div>
            )}

            {hasBiometric ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center mx-auto text-lg font-bold">
                  ID
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--foreground)]">Hi, {biometricUserName || 'Welcome Back'}!</h3>
                  <p className="text-xs text-[var(--muted)] mt-1">Access your Chammery account using device biometrics.</p>
                </div>
                
                <button
                  onClick={() => handleBiometricLogin()}
                  disabled={biometricLoading}
                  className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all hover:bg-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {biometricLoading ? 'Verifying Device...' : 'Login with Face ID / Touch ID'}
                </button>
                
                <button
                  onClick={() => setHasBiometric(false)}
                  className="text-xs font-bold text-[var(--muted)] hover:underline block mx-auto cursor-pointer"
                >
                  Use Email & Password Instead
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider" htmlFor="login-email">
                      Email or Employee ID
                    </label>
                    {/* Secondary option if they have biometrics registered but clicked to use password form */}
                    {showBiometricsLink && (
                      <button
                        type="button"
                        onClick={() => setHasBiometric(true)}
                        className="text-[10px] font-bold text-[var(--muted)] hover:underline cursor-pointer"
                      >
                        Use Biometrics
                      </button>
                    )}
                  </div>
                  <input
                    id="login-email"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                    placeholder="you@company.com or EMP001"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider" htmlFor="login-password">
                      Password
                    </label>
                    <Link href="/forgot-password" className="text-[10px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] hover:underline transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-1 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-[var(--muted)] font-semibold mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--foreground)] font-extrabold hover:underline">
              Register
            </Link>
          </p>

          <p className="text-center text-[10px] text-[var(--muted)]/60 font-medium mt-6 tracking-wide">
            Crafted by EPC IT Team
          </p>
        </div>
      </div>
    </main>
  );
}
