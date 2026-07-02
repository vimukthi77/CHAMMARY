'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    employeeId: '',
    workEmail: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Registration failed.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { id: 'reg-name', label: 'Full name', field: 'fullName', type: 'text', placeholder: 'Jane Smith', autoComplete: 'name' },
    { id: 'reg-empid', label: 'Employee ID', field: 'employeeId', type: 'text', placeholder: 'EMP001', autoComplete: 'off' },
    { id: 'reg-email', label: 'Work email', field: 'workEmail', type: 'email', placeholder: 'jane@company.com', autoComplete: 'email' },
    { id: 'reg-password', label: 'Password', field: 'password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
  ];

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Create account</h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-semibold">Join your team on Chammery</p>
        </div>

        <div className="bg-[var(--card)] rounded-2xl shadow-sm border-2 border-[var(--border)] p-6">
          {error && (
            <div className="mb-4 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ id, label, field, type, placeholder, autoComplete }) => (
              <div key={field}>
                <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-1.5" htmlFor={id}>
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  autoComplete={autoComplete}
                  required
                  value={form[field as keyof typeof form]}
                  onChange={update(field)}
                  className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-white text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
                  placeholder={placeholder}
                />
              </div>
            ))}

            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              Your wallet starts at Rs.0.00. Ask Ajith for a top-up to place orders.
            </p>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-1 rounded-xl bg-[var(--foreground)] text-white text-sm font-bold transition-all duration-150 hover:bg-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted)] font-semibold mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--foreground)] font-extrabold hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-[10px] text-[var(--muted)]/60 font-medium mt-6 tracking-wide">
          Crafted by EPC IT Team
        </p>
      </div>
    </main>
  );
}
