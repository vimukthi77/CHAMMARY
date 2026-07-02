'use client';

import { useEffect, useState, FormEvent } from 'react';

interface Prices {
  breakfastPrice: number;
  lunchPrice: number;
  dinnerPrice: number;
  breakfastCutoff: string;
  lunchCutoff: string;
  dinnerCutoff: string;
}

export default function AdminPricesPage() {
  const [prices, setPrices] = useState<Prices>({
    breakfastPrice: 0,
    lunchPrice: 0,
    dinnerPrice: 0,
    breakfastCutoff: '07:00',
    lunchCutoff: '10:30',
    dinnerCutoff: '18:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/prices');
        const data = await res.json();
        if (data.prices) {
          setPrices({
            breakfastPrice: data.prices.breakfastPrice,
            lunchPrice: data.prices.lunchPrice,
            dinnerPrice: data.prices.dinnerPrice,
            breakfastCutoff: data.prices.breakfastCutoff || '07:00',
            lunchCutoff: data.prices.lunchCutoff || '10:30',
            dinnerCutoff: data.prices.dinnerCutoff || '18:00',
          });
        }
      } catch {
        setError('Failed to load prices.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch('/api/admin/prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prices),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save configuration.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Meal Configuration</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Changes apply to all new orders immediately.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {[
            {
              label: 'Breakfast',
              priceKey: 'breakfastPrice' as const,
              cutoffKey: 'breakfastCutoff' as const,
            },
            {
              label: 'Lunch',
              priceKey: 'lunchPrice' as const,
              cutoffKey: 'lunchCutoff' as const,
            },
            {
              label: 'Dinner',
              priceKey: 'dinnerPrice' as const,
              cutoffKey: 'dinnerCutoff' as const,
            },
          ].map(({ label, priceKey, cutoffKey }) => (
            <div key={label} className="bg-[var(--card)] rounded-2xl border-2 border-[var(--border)] p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-[var(--foreground)] text-sm">{label} Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5" htmlFor={`price-${priceKey}`}>
                    Meal Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm font-bold">Rs.</span>
                    <input
                      id={`price-${priceKey}`}
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={prices[priceKey]}
                      onChange={(e) =>
                        setPrices((p) => ({ ...p, [priceKey]: Number(e.target.value) }))
                      }
                      className="w-full h-12 pl-10 pr-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5" htmlFor={`cutoff-${cutoffKey}`}>
                    Cutoff Time (IST)
                  </label>
                  <input
                    id={`cutoff-${cutoffKey}`}
                    type="time"
                    required
                    value={prices[cutoffKey]}
                    onChange={(e) =>
                      setPrices((p) => ({ ...p, [cutoffKey]: e.target.value }))
                    }
                    className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                  />
                </div>
              </div>
            </div>
          ))}

          {error && (
            <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-bold text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="px-3.5 py-3 rounded-xl bg-[var(--success-light)] border border-[var(--muted)]/30 text-sm text-[var(--success)] font-bold text-center">
              Meal prices and cutoff times updated successfully.
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="save-prices-btn"
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)] disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save configuration'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
