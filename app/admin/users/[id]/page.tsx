'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface MealRequestRecord {
  _id: string;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  totalAmount: number;
  balanceAfter: number;
}

interface TopUpRecord {
  _id: string;
  amount: number;
  balanceAfter: number;
  addedBy: string;
  createdAt: string;
}

interface UserProfileData {
  user: {
    fullName: string;
    workEmail: string;
    employeeId: string;
    walletBalance: number;
    isActive: boolean;
  };
  mealRequests: MealRequestRecord[];
  topups: TopUpRecord[];
  stats: {
    totalMealsOrdered: number;
    totalSpent: number;
  };
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'meals' | 'topups'>('meals');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setData(result);
      } catch {
        setError('Failed to load user profile data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
        {error || 'User profile not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header / Back Link */}
      <div>
        <Link href="/admin/users" className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1">
          ← Back to Users
        </Link>
        <h1 className="text-xl font-bold text-[var(--foreground)] mt-2">{data.user.fullName}</h1>
        <p className="text-xs text-[var(--muted)]">{data.user.workEmail} · ID: {data.user.employeeId}</p>
      </div>

      {/* User Stats Card */}
      <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm grid grid-cols-3 gap-2 divide-x-2 divide-[var(--border)] text-center">
        <div>
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wide">Balance</span>
          <p className="text-base font-extrabold text-[var(--foreground)] mt-0.5">Rs.{data.user.walletBalance.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wide">Meals</span>
          <p className="text-base font-extrabold text-[var(--foreground)] mt-0.5">{data.stats.totalMealsOrdered}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wide">Spent</span>
          <p className="text-base font-extrabold text-[var(--foreground)] mt-0.5">Rs.{data.stats.totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b-2 border-[var(--border)]">
        <button
          onClick={() => setActiveTab('meals')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors ${
            activeTab === 'meals'
              ? 'border-[var(--foreground)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--muted)]'
          }`}
        >
          Meal History ({data.mealRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('topups')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors ${
            activeTab === 'topups'
              ? 'border-[var(--foreground)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--muted)]'
          }`}
        >
          Top-Up Logs ({data.topups.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === 'meals' ? (
          data.mealRequests.length === 0 ? (
            <p className="text-center text-xs text-[var(--muted)] py-6 font-semibold">No meal requests found.</p>
          ) : (
            data.mealRequests.map((r) => (
              <div key={r._id} className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3.5 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">{formatDate(r.date)}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.breakfast && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-light)] font-bold text-[var(--foreground)] uppercase tracking-wider">Breakfast</span>}
                    {r.lunch && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-light)] font-bold text-[var(--foreground)] uppercase tracking-wider">Lunch</span>}
                    {r.dinner && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-light)] font-bold text-[var(--foreground)] uppercase tracking-wider">Dinner</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-[var(--foreground)]">Rs.{r.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            ))
          )
        ) : data.topups.length === 0 ? (
          <p className="text-center text-xs text-[var(--muted)] py-6 font-semibold">No top-ups found.</p>
        ) : (
          data.topups.map((t) => (
            <div key={t._id} className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3.5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">+Rs.{t.amount.toFixed(2)}</p>
                <p className="text-[10px] text-[var(--muted)] font-semibold mt-0.5">{formatTime(t.createdAt)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--muted)] font-semibold">By {t.addedBy}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
