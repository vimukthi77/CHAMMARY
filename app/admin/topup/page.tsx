'use client';

import { useState, useEffect, useMemo } from 'react';

interface StaffUser {
  _id: string;
  fullName: string;
  workEmail: string;
  employeeId: string;
  walletBalance: number;
  isActive: boolean;
}

export default function AdminTopupPage() {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<StaffUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [amount, setAmount] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const quickAmounts = [100, 200, 500, 1000];

  // Load all staff users once on mount
  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        setAllUsers(data.users ?? []);
      } catch {
        setError('Failed to load user list.');
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  // Filter client-side as admin types
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.workEmail.toLowerCase().includes(q) ||
        u.employeeId.toLowerCase().includes(q)
    );
  }, [search, allUsers]);

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
      // Update balance in both selected user and the master list
      const newBalance = data.newBalance;
      setSelectedUser((prev) => (prev ? { ...prev, walletBalance: newBalance } : null));
      setAllUsers((prev) =>
        prev.map((u) => (u._id === selectedUser._id ? { ...u, walletBalance: newBalance } : u))
      );
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
        <p className="text-sm text-[var(--muted)] mt-0.5">Select a staff member and add balance</p>
      </div>

      <form onSubmit={handleTopUp} className="space-y-4">
        {/* ── User Selection ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[var(--foreground)]">
            Select Staff User
          </label>

          {selectedUser ? (
            /* ── Selected user card ── */
            <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-bold text-sm text-[var(--foreground)]">{selectedUser.fullName}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{selectedUser.workEmail}</p>
                <p className="text-xs text-[var(--foreground)] font-bold mt-1">
                  Current Balance: Rs.{selectedUser.walletBalance.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setSuccess(false);
                  setError('');
                  setAmount('');
                }}
                className="text-xs font-bold text-red-500 border border-red-200 bg-red-50/50 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            /* ── Search + List ── */
            <div className="space-y-2">
              {/* Search bar */}
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none"
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email or employee ID…"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border-2 border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                />
                {loadingUsers && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Users list */}
              {!loadingUsers && (
                <div className="border-2 border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)] shadow-sm max-h-64 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                      {search ? 'No users match your search.' : 'No staff users registered yet.'}
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--border)]">
                      {filteredUsers.map((user) => (
                        <li key={user._id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setSearch('');
                              setSuccess(false);
                              setError('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-[var(--foreground)] truncate">
                                {user.fullName}
                              </p>
                              <p className="text-[10px] text-[var(--muted)] truncate">
                                {user.workEmail} · {user.employeeId}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[var(--foreground)] shrink-0">
                              Rs.{user.walletBalance.toFixed(2)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* User count badge */}
              {!loadingUsers && allUsers.length > 0 && (
                <p className="text-[10px] text-[var(--muted)] text-right pr-1">
                  {filteredUsers.length} of {allUsers.length} staff member{allUsers.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Amount section (only when user is selected) ─────────────────── */}
        {selectedUser && (
          <>
            {/* Quick Amounts */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                Quick TopUp Amounts
              </label>
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
              <label
                className="block text-sm font-semibold text-[var(--foreground)]"
                htmlFor="topup-amount-form"
              >
                Custom TopUp Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm font-bold">
                  Rs.
                </span>
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

            {/* Submit */}
            <div className="pt-2">
              <button
                id="submit-topup-btn"
                type="submit"
                disabled={submitting || !amount}
                className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)] disabled:opacity-40"
              >
                {submitting
                  ? 'Completing TopUp…'
                  : `Confirm TopUp · Rs.${Number(amount || 0).toFixed(2)}`}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
