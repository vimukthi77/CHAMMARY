'use client';

import { useEffect, useState, useCallback } from 'react';

interface TopUpRecord {
  _id: string;
  amount: number;
  balanceAfter: number;
  addedBy: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WalletHistoryPage() {
  const [topups, setTopups] = useState<TopUpRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/wallet-history?page=${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopups(data.topups);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load wallet top-up history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--foreground)]">Top-Up History</h1>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && topups.length === 0 && (
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="font-semibold text-sm">No top-ups yet</p>
          <p className="text-xs mt-1">When the administrator tops up your wallet, it will show here.</p>
        </div>
      )}

      <div className="space-y-3">
        {topups.map((t) => (
          <div
            key={t._id}
            className="bg-[var(--card)] rounded-2xl border-2 border-[var(--border)] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">
                  Top-up: +Rs.{t.amount.toFixed(2)}
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-1 font-semibold">{formatDate(t.createdAt)}</p>
                <p className="text-[10px] text-[var(--muted)] font-semibold">Added By: {t.addedBy}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">Balance</p>
                <p className="text-base font-extrabold text-[var(--foreground)] mt-0.5">Rs.{t.balanceAfter.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            id="wallet-history-prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--foreground)] disabled:opacity-40 transition-all duration-150 bg-white"
          >
            ← Previous
          </button>
          <span className="text-sm text-[var(--muted)]">
            {page} / {pagination.totalPages}
          </span>
          <button
            id="wallet-history-next"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--foreground)] disabled:opacity-40 transition-all duration-150 bg-white"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
