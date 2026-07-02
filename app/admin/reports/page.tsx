'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReportRow {
  userName: string;
  employeeId: string;
  workEmail: string;
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  mealCost: number;
  walletBalance: number;
  topupDetails: string;
  mealsCount: number;
}

interface SummaryData {
  totalMeals: number;
  totalIncome: number;
  totalTopups: number;
  startDate: string;
  endDate: string;
}

export default function AdminReportsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Default to first day of current month as start date
  const firstDayOfMonth = (() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/reports?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.requests || []);
      setSummary(data.summary || null);
    } catch {
      setError('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    const url = `/api/admin/reports?startDate=${startDate}&endDate=${endDate}&format=${format}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Reports & Analytics</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Filter and export ordering data</p>
        </div>
        <button
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            window.open(`/api/admin/reports?startDate=${today}&endDate=${today}&format=pdf`, '_blank');
          }}
          className="px-5 py-3 rounded-2xl bg-[var(--foreground)] hover:bg-[#3d1a0b] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-2 border-[var(--foreground)] w-full sm:w-auto"
        >
          <span>Download Today's PDF Report</span>
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Filter by Date Range</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase mb-1" htmlFor="report-from">
              From
            </label>
            <input
              id="report-from"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-xs focus:ring-2 focus:ring-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase mb-1" htmlFor="report-to">
              To
            </label>
            <input
              id="report-to"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-xs focus:ring-2 focus:ring-[var(--foreground)]"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 text-center shadow-sm">
            <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wide">Total Meals</span>
            <p className="text-base font-extrabold text-[var(--foreground)] mt-0.5">{summary.totalMeals}</p>
          </div>
          <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 text-center shadow-sm">
            <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wide">Total Income</span>
            <p className="text-base font-extrabold text-[var(--foreground)] mt-0.5">Rs.{summary.totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-xl p-3 text-center shadow-sm">
            <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wide">Top-Ups</span>
            <p className="text-base font-extrabold text-[var(--foreground)] mt-0.5">Rs.{summary.totalTopups.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Export Report</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            id="export-csv-btn"
            onClick={() => handleExport('csv')}
            className="py-2.5 rounded-lg border-2 border-[var(--border)] hover:border-[var(--foreground)] text-xs font-bold text-[var(--foreground)] bg-white transition-all flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <span>CSV</span>
          </button>
          <button
            id="export-xlsx-btn"
            onClick={() => handleExport('xlsx')}
            className="py-2.5 rounded-lg border-2 border-[var(--border)] hover:border-[var(--foreground)] text-xs font-bold text-[var(--foreground)] bg-white transition-all flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <span>Excel</span>
          </button>
          <button
            id="export-pdf-btn"
            onClick={() => handleExport('pdf')}
            className="py-2.5 rounded-lg border-2 border-[var(--border)] hover:border-[var(--foreground)] text-xs font-bold text-[var(--foreground)] bg-white transition-all flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Main Table view */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl">
          <p className="text-sm font-medium text-[var(--muted)]">No records found in range.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Detailed Log</h3>
            <span className="text-xs font-bold text-[var(--muted)]">{rows.length} rows</span>
          </div>

          <div className="overflow-x-auto border-2 border-[var(--border)] rounded-2xl bg-[var(--card)] shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[var(--border)] bg-slate-50 font-bold uppercase tracking-wider text-[var(--muted)]">
                  <th className="p-3 font-bold text-[10px]">Name</th>
                  <th className="p-3 font-bold text-[10px] text-center">Breakfast</th>
                  <th className="p-3 font-bold text-[10px] text-center">Lunch</th>
                  <th className="p-3 font-bold text-[10px] text-center">Dinner</th>
                  <th className="p-3 font-bold text-[10px] text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((row, i) => (
                  <tr key={`${row.userName}-${row.date}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <p className="font-bold text-[var(--foreground)]">{row.userName}</p>
                      <p className="text-[9px] text-[var(--muted)] mt-0.5">ID: {row.employeeId}</p>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
                        {row.breakfast === 'Yes' ? (
                          <span className="w-5 h-5 rounded-full bg-green-100 border border-green-300 text-green-700 font-extrabold text-[10px] flex items-center justify-center">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
                        {row.lunch === 'Yes' ? (
                          <span className="w-5 h-5 rounded-full bg-green-100 border border-green-300 text-green-700 font-extrabold text-[10px] flex items-center justify-center">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center">
                        {row.dinner === 'Yes' ? (
                          <span className="w-5 h-5 rounded-full bg-green-100 border border-green-300 text-green-700 font-extrabold text-[10px] flex items-center justify-center">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-[var(--foreground)] whitespace-nowrap">Rs.{row.mealCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
