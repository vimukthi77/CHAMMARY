'use client';

import { useEffect, useState } from 'react';

interface SummaryData {
  monthLabel: string;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  totalSpent: number;
  totalOrders: number;
}

export default function SummaryPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/meals/summary');
        const summary = await res.json();
        if (!res.ok) throw new Error(summary.error);
        setData(summary);
      } catch {
        setError('Failed to load monthly summary stats.');
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

  const items = [
    { label: 'Breakfasts ordered', value: data?.breakfastCount ?? 0 },
    { label: 'Lunches ordered', value: data?.lunchCount ?? 0 },
    { label: 'Dinners ordered', value: data?.dinnerCount ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Monthly Stats</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">{data?.monthLabel}</p>
      </div>

      {/* Summary Spent Card */}
      <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider">Total Spent This Month</p>
        <p className="text-3xl font-extrabold text-[var(--foreground)] mt-1">
          Rs.{(data?.totalSpent ?? 0).toFixed(2)}
        </p>
        <p className="text-xs text-[var(--muted)] mt-2">
          Calculated from {data?.totalOrders ?? 0} active daily meal records.
        </p>
      </div>

      {/* Breakdowns */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">Meal Breakdown</h2>
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm text-[var(--foreground)]">{item.label}</span>
              </div>
              <span className="text-lg font-bold text-[var(--foreground)]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
