'use client';

import { useState, useEffect, useCallback } from 'react';

interface StaffUser {
  _id: string;
  fullName: string;
  workEmail: string;
  employeeId: string;
  walletBalance: number;
}

export default function AdminTopupPage() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [amount, setAmount] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const quickAmounts = [100, 200, 500, 1000];

  const loadUsers = useCallback(async (q = '') => {
    if (!q) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to fetch user list.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(search), 300);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a user first.');
      return;
    }
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setError('');
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser._id, amount: num }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to complete top-up.');
        return;
      }

      setSuccess(true);
      // Update local wallet balance preview
      setSelectedUser((prev) => prev ? { ...prev, walletBalance: data.newBalance } : null);
      setAmount('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Top Up Wallet</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Search staff user and add balance</p>
      </div>

      <form onSubmit={handleTopUp} className="space-y-4">
        {/* User Search / Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[var(--foreground)]">
            Select Staff User
          </label>
          {selectedUser ? (
            <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-bold text-sm text-[var(--foreground)]">{selectedUser.fullName}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{selectedUser.workEmail}</p>
                <p className="text-xs text-[var(--foreground)] font-bold mt-1">Current Balance: Rs.{selectedUser.walletBalance.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setSuccess(false);
                }}
                className="text-xs font-bold text-red-500 border border-red-200 bg-red-50/50 px-2.5 py-1.5 rounded-lg hover:bg-red-50"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type staff name or email…"
                className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
              />

              {loadingUsers && (
                <div className="absolute right-3.5 top-3.5">
                  <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Suggestions dropdown */}
              {users.length > 0 && (
                <div className="absolute left-0 right-0 top-13 z-10 bg-[var(--card)] border-2 border-[var(--border)] rounded-xl shadow-lg divide-y divide-[var(--border)] max-h-48 overflow-y-auto">
                  {users.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(user);
                        setUsers([]);
                        setSearch('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-xs text-[var(--foreground)]">{user.fullName}</p>
                        <p className="text-[10px] text-[var(--muted)]">{user.workEmail}</p>
                      </div>
                      <span className="text-xs font-bold text-[var(--foreground)]">Rs.{user.walletBalance.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedUser && (
          <>
            {/* Quick Amounts */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--foreground)]">Quick TopUp Amounts</label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`h-11 rounded-xl text-sm font-bold border transition-all duration-150 ${
                      amount === String(q)
                        ? 'bg-[var(--foreground)] text-white border-[var(--foreground)] shadow-sm'
                        : 'bg-white text-[var(--foreground)] border-2 border-[var(--border)] hover:border-[var(--foreground)]'
                    }`}
                  >
                    +Rs.{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="topup-amount-form">
                Custom TopUp Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm font-bold">Rs.</span>
                <input
                  id="topup-amount-form"
                  type="number"
                  min={1}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-12 pl-10 pr-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)]"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            {error && (
              <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-bold text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="px-3.5 py-3 rounded-xl bg-[var(--success-light)] border border-[var(--muted)]/30 text-sm text-[var(--success)] font-bold text-center">
                Wallet recharged successfully.
              </div>
            )}

            {/* Submit button */}
            <div className="pt-2">
              <button
                id="submit-topup-btn"
                type="submit"
                disabled={submitting || !amount}
                className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)] disabled:opacity-40"
              >
                {submitting ? 'Completing TopUp…' : `Confirm TopUp · Rs.${Number(amount || 0).toFixed(2)}`}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
