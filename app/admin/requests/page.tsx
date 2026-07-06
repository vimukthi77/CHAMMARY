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
  const [activeTab, setActiveTab] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');

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

  // Filter requests based on selected tab
  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    return r[activeTab] === true;
  });

  const handleDownload = (format: 'pdf' | 'xlsx') => {
    const mealParam = activeTab === 'all' ? '' : `&mealType=${activeTab}`;
    const url = `/api/admin/reports?startDate=${date}&endDate=${date}&format=${format}${mealParam}`;
    window.open(url, '_blank');
  };

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

          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--border)]">
            {(['all', 'breakfast', 'lunch', 'dinner'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const count = tab === 'all' 
                ? requests.length 
                : tab === 'breakfast' 
                ? stats.breakfast 
                : tab === 'lunch' 
                ? stats.lunch 
                : stats.dinner;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all capitalize flex items-center justify-center gap-1 cursor-pointer ${
                    isActive
                      ? 'border-[var(--foreground)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <span>{tab}</span>
                  {count > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Download Options for Active Tab */}
          <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                {activeTab === 'all' ? 'Overall Reports' : `${activeTab} Reports`}
              </h3>
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase">
                {activeTab === 'all' ? `${requests.length} total orders` : `${filteredRequests.length} orders`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDownload('pdf')}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--border)] hover:border-[var(--foreground)] text-xs font-bold text-[var(--foreground)] bg-white transition-all cursor-pointer hover:bg-slate-50"
              >
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => handleDownload('xlsx')}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--border)] hover:border-[var(--foreground)] text-xs font-bold text-[var(--foreground)] bg-white transition-all cursor-pointer hover:bg-slate-50"
              >
                <span>Download Excel</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wide">
              {formattedDate}
            </p>
            <p className="text-xs text-[var(--muted)]">{filteredRequests.length} orders shown</p>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl">
              <p className="text-sm font-medium text-[var(--muted)]">No meal requests for this day.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((r) => {
                const prep = preparedItems[r._id] || {};
                const name = r.userId?.fullName || 'Unknown User';
                const empId = r.userId?.employeeId || 'N/A';

                // Specific tab single meal checklist layout
                if (activeTab !== 'all') {
                  const isPrepared = prep[activeTab] || false;

                  const buttonStyle = isPrepared
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/50'
                    : activeTab === 'breakfast'
                    ? 'bg-orange-50/50 border-orange-200 text-orange-800 hover:bg-orange-50'
                    : activeTab === 'lunch'
                    ? 'bg-green-50/50 border-green-200 text-green-800 hover:bg-green-50'
                    : 'bg-blue-50/50 border-blue-200 text-blue-800 hover:bg-blue-50';

                  return (
                    <div
                      key={r._id}
                      className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 transition-all"
                    >
                      <div>
                        <p className="font-bold text-sm text-[var(--foreground)]">{name}</p>
                        <p className="text-xs text-[var(--muted)]">Employee ID: {empId}</p>
                      </div>
                      <button
                        onClick={() => togglePrepared(r._id, activeTab)}
                        className={`py-2.5 px-5 rounded-xl border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${buttonStyle}`}
                      >
                        {isPrepared ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>Prepared ✓</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>Pending</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                }

                // Overall Tab list layout
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
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
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
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
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
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
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
