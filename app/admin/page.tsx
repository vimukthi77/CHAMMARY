'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalUsers: number;
  totalWalletBalance: number;
  todayOrders: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  todayIncome: number;
  monthIncome: number;
  totalTopupsThisMonth: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStats(data);
      } catch {
        setError('Failed to load admin stats.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
        {error}
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Overview</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">{today}</p>
      </div>

      {/* Primary Financial Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Today&apos;s Income</span>
          <p className="text-xl font-extrabold text-[var(--foreground)] mt-1">Rs.{(stats?.todayIncome ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">This Month</span>
          <p className="text-xl font-extrabold text-[var(--foreground)] mt-1">Rs.{(stats?.monthIncome ?? 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Kitchen Order Status Today */}
      <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-sm text-[var(--foreground)] uppercase tracking-wide">Today&apos;s Kitchen Counts</h3>
          <span className="px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--foreground)] text-xs font-semibold">
            {stats?.todayOrders} orders
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-orange-50 border border-orange-100">
            <p className="text-[10px] text-orange-700 font-bold uppercase">Breakfast</p>
            <p className="text-lg font-extrabold text-orange-900 mt-0.5">{stats?.breakfastCount}</p>
          </div>
          <div className="p-2 rounded-xl bg-green-50 border border-green-100">
            <p className="text-[10px] text-green-700 font-bold uppercase">Lunch</p>
            <p className="text-lg font-extrabold text-green-900 mt-0.5">{stats?.lunchCount}</p>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-[10px] text-blue-700 font-bold uppercase">Dinner</p>
            <p className="text-lg font-extrabold text-blue-900 mt-0.5">{stats?.dinnerCount}</p>
          </div>
        </div>
      </div>

      {/* System stats */}
      <div className="space-y-3">
        <h3 className="font-semibold text-xs text-[var(--muted)] uppercase tracking-wider">System Information</h3>
        <div className="space-y-2">
          <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">Total Staff</span>
            </div>
            <span className="text-base font-bold text-[var(--foreground)]">{stats?.totalUsers}</span>
          </div>

          <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">Sum of Wallet Balances</span>
            </div>
            <span className="text-base font-bold text-[var(--foreground)]">Rs.{(stats?.totalWalletBalance ?? 0).toFixed(2)}</span>
          </div>

          <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">Top-ups (This Month)</span>
            </div>
            <span className="text-base font-bold text-[var(--foreground)]">Rs.{(stats?.totalTopupsThisMonth ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
