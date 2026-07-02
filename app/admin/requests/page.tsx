'use client';

import { useEffect, useState } from 'react';

interface UserDetail {
  _id: string;
  fullName: string;
  employeeId: string;
  workEmail: string;
}

interface MealRequestItem {
  _id: string;
  userId: UserDetail;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  totalAmount: number;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<MealRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Local checked state for kitchen staff to tick off orders physically prepared
  const [preparedItems, setPreparedItems] = useState<Record<string, { breakfast?: boolean; lunch?: boolean; dinner?: boolean }>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/admin/requests?date=${date}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRequests(data.requests || []);
      } catch {
        setError('Failed to load today\'s requests.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date]);

  // Compute stats for the selected date
  const stats = requests.reduce(
    (acc, r) => {
      if (r.breakfast) acc.breakfast++;
      if (r.lunch) acc.lunch++;
      if (r.dinner) acc.dinner++;
      return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0 }
  );

  const togglePrepared = (requestId: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    setPreparedItems((prev) => {
      const current = prev[requestId] || {};
      return {
        ...prev,
        [requestId]: {
          ...current,
          [meal]: !current[meal],
        },
      };
    });
  };

  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Kitchen Checklist</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Manage and check off prepared meals</p>
      </div>

      {/* Date Picker */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
        <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2" htmlFor="checklist-date">
          Select Date
        </label>
        <input
          id="checklist-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <>
          {/* Summary counts */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 text-center shadow-sm">
              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Breakfast</span>
              <p className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">{stats.breakfast}</p>
            </div>
            <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 text-center shadow-sm">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Lunch</span>
              <p className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">{stats.lunch}</p>
            </div>
            <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 text-center shadow-sm">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Dinner</span>
              <p className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">{stats.dinner}</p>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">
              {formattedDate}
            </p>
            <p className="text-xs text-[var(--muted)]">{requests.length} orders total</p>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12 bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl">
              <p className="text-sm font-medium text-[var(--muted)]">No meal requests for this day.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const prep = preparedItems[r._id] || {};
                const name = r.userId?.fullName || 'Unknown User';
                const empId = r.userId?.employeeId || 'N/A';

                return (
                  <div
                    key={r._id}
                    className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div>
                      <p className="font-bold text-sm text-[var(--foreground)]">{name}</p>
                      <p className="text-xs text-[var(--muted)]">Employee ID: {empId}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {r.breakfast && (
                        <button
                          onClick={() => togglePrepared(r._id, 'breakfast')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                            prep.breakfast
                              ? 'bg-slate-100 border-slate-300 text-slate-400 line-through'
                              : 'bg-orange-50/50 border-orange-200 text-orange-800'
                          }`}
                        >
                          <span>Breakfast</span>
                          <span className="text-[9px] uppercase tracking-wider">
                            {prep.breakfast ? 'Prepared' : 'Pending'}
                          </span>
                        </button>
                      )}
                      {r.lunch && (
                        <button
                          onClick={() => togglePrepared(r._id, 'lunch')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                            prep.lunch
                              ? 'bg-slate-100 border-slate-300 text-slate-400 line-through'
                              : 'bg-green-50/50 border-green-200 text-green-800'
                          }`}
                        >
                          <span>Lunch</span>
                          <span className="text-[9px] uppercase tracking-wider">
                            {prep.lunch ? 'Prepared' : 'Pending'}
                          </span>
                        </button>
                      )}
                      {r.dinner && (
                        <button
                          onClick={() => togglePrepared(r._id, 'dinner')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                            prep.dinner
                              ? 'bg-slate-100 border-slate-300 text-slate-400 line-through'
                              : 'bg-blue-50/50 border-blue-200 text-blue-800'
                          }`}
                        >
                          <span>Dinner</span>
                          <span className="text-[9px] uppercase tracking-wider">
                            {prep.dinner ? 'Prepared' : 'Pending'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
