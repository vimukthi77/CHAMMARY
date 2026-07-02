'use client';

import { useEffect, useState, useCallback } from 'react';

interface MealRecord {
  _id: string;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  totalAmount: number;
  balanceAfter: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
}

function MealTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--foreground)] text-[10px] font-bold uppercase tracking-wider">
      {label}
    </span>
  );
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function HistoryPage() {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/meal-history?page=${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(data.requests);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--foreground)]">Order History</h1>

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

      {!loading && records.length === 0 && (
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="font-semibold text-sm">No orders yet</p>
          <p className="text-xs mt-1">Your meal history will appear here.</p>
        </div>
      )}

      <div className="space-y-3">
        {records.map((r) => (
          <div
            key={r._id}
            className="bg-[var(--card)] rounded-2xl border-2 border-[var(--border)] p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-[var(--foreground)] text-sm">{formatDate(r.date)}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.breakfast && <MealTag label="Breakfast" />}
                  {r.lunch && <MealTag label="Lunch" />}
                  {r.dinner && <MealTag label="Dinner" />}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-extrabold text-[var(--foreground)]">Rs.{r.totalAmount.toFixed(2)}</p>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wide mt-0.5">Bal: Rs.{r.balanceAfter.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            id="history-prev"
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
            id="history-next"
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
