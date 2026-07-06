'use client';

import { useEffect, useState, useCallback } from 'react';

interface MealPrices {
  breakfastPrice: number;
  lunchPrice: number;
  dinnerPrice: number;
  breakfastCutoff?: string;
  lunchCutoff?: string;
  dinnerCutoff?: string;
}

function formatTime12Hour(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hours12 = h % 12 || 12;
  const minutesStr = m < 10 ? `0${m}` : m;
  return `${hours12}:${minutesStr} ${ampm}`;
}

interface ExistingRequest {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  totalAmount: number;
  balanceAfter: number;
}

interface UserInfo {
  fullName: string;
  walletBalance: number;
}

type MealKey = 'breakfast' | 'lunch' | 'dinner';

const MEALS: { key: MealKey; label: string; priceKey: 'breakfastPrice' | 'lunchPrice' | 'dinnerPrice'; timeLimit: string }[] = [
  { key: 'breakfast', label: 'Breakfast', priceKey: 'breakfastPrice', timeLimit: '7:00 AM' },
  { key: 'lunch', label: 'Lunch', priceKey: 'lunchPrice', timeLimit: '10:30 AM' },
  { key: 'dinner', label: 'Dinner', priceKey: 'dinnerPrice', timeLimit: '6:00 PM' },
];

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prices, setPrices] = useState<MealPrices | null>(null);
  const [existing, setExisting] = useState<ExistingRequest | null>(null);
  const [selected, setSelected] = useState({ breakfast: false, lunch: false, dinner: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Cutoff Switching states
  const [targetDate, setTargetDate] = useState<string>('');
  const [isTomorrow, setIsTomorrow] = useState<boolean>(false);
  
  // Time state for client-side cutoff checks
  const [currentMinutes, setCurrentMinutes] = useState(0);

  // WebAuthn biometric state
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState('');
  const [biometricError, setBiometricError] = useState('');
  const [hasBiometricsRegistered, setHasBiometricsRegistered] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, mealRes] = await Promise.all([
        fetch('/api/me'),
        fetch('/api/meals/request'),
      ]);
      const meData = await meRes.json();
      const mealData = await mealRes.json();

      setUser({ fullName: meData.fullName, walletBalance: meData.walletBalance });
      setPrices(mealData.prices);
      setTargetDate(mealData.targetDate || '');
      setIsTomorrow(mealData.isTomorrow || false);

      if (mealData.request) {
        setExisting(mealData.request);
        setSelected({
          breakfast: mealData.request.breakfast,
          lunch: mealData.request.lunch,
          dinner: mealData.request.dinner,
        });
      }
    } catch {
      setErrorMessage('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setHasBiometricsRegistered(localStorage.getItem('has_biometrics_registered') === 'true');

    // Determine current minutes in IST on the client
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);
      setCurrentMinutes(istTime.getHours() * 60 + istTime.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Cutoff checks in minutes
  const isCutoffExceeded = (key: MealKey) => {
    if (isTomorrow) return false; // Bypass cutoffs for tomorrow's orders
    if (!prices) return false;
    const parseTimeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    if (key === 'breakfast') {
      const limit = parseTimeToMinutes(prices.breakfastCutoff || '07:00');
      return currentMinutes >= limit;
    }
    if (key === 'lunch') {
      const limit = parseTimeToMinutes(prices.lunchCutoff || '10:30');
      return currentMinutes >= limit;
    }
    if (key === 'dinner') {
      const limit = parseTimeToMinutes(prices.dinnerCutoff || '18:00');
      return currentMinutes >= limit;
    }
    return false;
  };

  function toggle(key: MealKey) {
    if (isCutoffExceeded(key)) return; // Prevent toggle if past cutoff
    setSelected((s) => ({ ...s, [key]: !s[key] }));
    setSuccessMessage('');
    setErrorMessage('');
  }

  const total = prices
    ? (selected.breakfast ? prices.breakfastPrice : 0) +
      (selected.lunch ? prices.lunchPrice : 0) +
      (selected.dinner ? prices.dinnerPrice : 0)
    : 0;

  const noneSelected = !selected.breakfast && !selected.lunch && !selected.dinner;
  
  const unchanged =
    existing &&
    existing.breakfast === selected.breakfast &&
    existing.lunch === selected.lunch &&
    existing.dinner === selected.dinner;

  const netDelta = total - (existing ? existing.totalAmount : 0);
  const currentBalance = user?.walletBalance ?? 0;
  const isInsufficient = currentBalance - netDelta < 0;

  async function handleSubmit() {
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/meals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setErrorMessage('Insufficient balance.');
        } else {
          setErrorMessage(data.error ?? 'Failed to submit request.');
        }
        return;
      }

      if (data.request) {
        setExisting(data.request);
        setSelected({
          breakfast: data.request.breakfast,
          lunch: data.request.lunch,
          dinner: data.request.dinner,
        });
      } else {
        setExisting(null);
        setSelected({ breakfast: false, lunch: false, dinner: false });
      }

      if (data.targetDate) setTargetDate(data.targetDate);
      if (data.isTomorrow !== undefined) setIsTomorrow(data.isTomorrow);

      setSuccessMessage(noneSelected ? 'Meal request cancelled successfully.' : 'Meal request submitted successfully.');
      setUser((u) => u ? { ...u, walletBalance: data.balanceAfter } : u);
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterBiometric() {
    setBiometricLoading(true);
    setBiometricSuccess('');
    setBiometricError('');
    try {
      const optRes = await fetch('/api/auth/webauthn/register-options', { method: 'POST' });
      const options = await optRes.json();
      if (!optRes.ok) {
        throw new Error(options.error || 'Failed to fetch registration options.');
      }

      const { startRegistration } = await import('@simplewebauthn/browser');
      const regResponse = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResponse),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Biometric verification failed.');
      }

      localStorage.setItem('has_biometrics_registered', 'true');
      if (user?.fullName) {
        localStorage.setItem('biometric_user_name', user.fullName);
      }
      const meRes = await fetch('/api/me');
      const meData = await meRes.json();
      if (meData.workEmail) {
        localStorage.setItem('biometric_email', meData.workEmail);
      }

      setHasBiometricsRegistered(true);
      setBiometricSuccess('Biometric login successfully registered on this device!');
    } catch (err: any) {
      console.error(err);
      setBiometricError(err.message || 'Setup failed. Your device might not support WebAuthn, or setup was cancelled.');
    } finally {
      setBiometricLoading(false);
    }
  }

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function formatLocalDateString(dateStr: string) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Greeting Section */}
      <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
        <div>
          <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Welcome,</p>
          <h1 className="text-xl font-bold text-[var(--foreground)] mt-0.5">
            {user?.fullName ? user.fullName.split(' ')[0] : 'User'}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
            {isTomorrow ? 'Ordering For' : 'Today\'s Date'}
          </p>
          <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">
            {targetDate ? formatLocalDateString(targetDate) : today}
          </p>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-5 shadow-sm text-center">
        <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">Current Balance</p>
        <p className="text-3xl font-extrabold text-[var(--foreground)] mt-1">
          Rs.{(user?.walletBalance ?? 0).toFixed(2)}
        </p>
      </div>

      {/* Active state message banner */}
      {existing && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
          <p className="text-xs text-emerald-800 font-bold">
            Order confirmed for {isTomorrow ? 'tomorrow' : 'today'}. {isTomorrow ? 'You can modify your selection until tomorrow\'s cutoffs.' : 'You can modify remaining options before their cutoffs.'}
          </p>
        </div>
      )}

      {/* Meal Selection Checklist */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider px-1">
          {isTomorrow ? 'Request your tomorrow meals' : 'Today\'s Meal Options'}
        </h2>
        {MEALS.map(({ key, label, priceKey }) => {
          const price = prices?.[priceKey] ?? 0;
          const active = selected[key];
          const disabled = isCutoffExceeded(key);

          const timeLimitStr = 
            key === 'breakfast' ? prices?.breakfastCutoff :
            key === 'lunch' ? prices?.lunchCutoff :
            prices?.dinnerCutoff;
          const timeLimit = formatTime12Hour(timeLimitStr) || 
            (key === 'breakfast' ? '7:00 AM' : key === 'lunch' ? '10:30 AM' : '6:00 PM');

          return (
            <button
              key={key}
              id={`meal-toggle-${key}`}
              onClick={() => toggle(key)}
              disabled={disabled}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border-2 transition-all duration-150 text-left ${
                disabled
                  ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                  : active
                  ? 'border-[var(--foreground)] bg-[var(--accent-light)]/40'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]'
              }`}
            >
              <div>
                <span className="font-bold text-sm text-[var(--foreground)] block">
                  {label}
                </span>
                <span className="text-[10px] text-[var(--muted)] font-semibold mt-0.5 block">
                  {isTomorrow 
                    ? `Cutoff: ${timeLimit} tomorrow`
                    : disabled 
                    ? `Closed (Cutoff: ${timeLimit})` 
                    : `Order before ${timeLimit}`
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm font-bold text-[var(--foreground)]">
                  Rs.{price.toFixed(2)}
                </span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  disabled
                    ? 'border-slate-300 bg-slate-200'
                    : active
                    ? 'border-[var(--foreground)] bg-[var(--foreground)] text-white'
                    : 'border-[var(--border)]'
                }`}>
                  {active && !disabled && <span className="text-[10px] font-bold">✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Running Total Preview */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Running Total</span>
          <span className="text-base font-extrabold text-[var(--foreground)]">Rs.{total.toFixed(2)}</span>
        </div>
      )}

      {/* Success & Error alerts */}
      {successMessage && (
        <div className="px-3.5 py-3 rounded-xl bg-[var(--success-light)] border border-[var(--muted)]/30 text-sm text-[var(--success)] font-bold text-center">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-bold text-center">
          {errorMessage}
        </div>
      )}

      {isInsufficient && !noneSelected && !unchanged && (
        <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-bold text-center">
          Insufficient balance. Please contact the administrator for a top-up.
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          id="submit-meal-request-btn"
          onClick={handleSubmit}
          disabled={submitting || (noneSelected && !existing) || !!unchanged || (isInsufficient && !noneSelected)}
          className="w-full h-12 rounded-xl bg-[var(--foreground)] hover:bg-[var(--accent)] text-white text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? 'Submitting Request…'
            : unchanged
            ? 'No Changes'
            : isInsufficient && !noneSelected
            ? 'Insufficient Balance'
            : noneSelected && existing
            ? 'Cancel All Meals'
            : existing
            ? 'Update Request'
            : 'Submit Request'}
        </button>
      </div>

      {/* Biometric setup */}
      {!hasBiometricsRegistered && (
        <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 w-7 h-7 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] font-bold text-xs shrink-0">
              ID
            </div>
            <div>
              <h3 className="font-bold text-xs text-[var(--foreground)] uppercase tracking-wider">Biometric Login</h3>
              <p className="text-[10px] text-[var(--muted)] font-medium mt-0.5 leading-relaxed">
                Enable Face ID, Touch ID, or Windows Hello to log in quickly next time without entering your password.
              </p>
            </div>
          </div>

          {biometricSuccess && (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-800 font-bold">
              {biometricSuccess}
            </div>
          )}

          {biometricError && (
            <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-[10px] text-red-800 font-bold">
              {biometricError}
            </div>
          )}

          <button
            onClick={handleRegisterBiometric}
            disabled={biometricLoading}
            className="w-full h-10 px-4 rounded-xl border-2 border-[var(--foreground)] text-[var(--foreground)] bg-transparent hover:bg-[var(--accent-light)] text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            {biometricLoading ? 'Configuring Device...' : 'Register Device Biometrics'}
          </button>
        </div>
      )}
    </div>
  );
}
