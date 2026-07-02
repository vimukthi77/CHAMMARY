'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { href: '/dashboard', label: 'Order' },
  { href: '/dashboard/history', label: 'History' },
  { href: '/dashboard/wallet-history', label: 'Top-Ups' },
  { href: '/dashboard/summary', label: 'Stats' },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--background)]">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-bold text-[var(--foreground)] text-base">Chammery</span>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-150"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--card)] border-t border-[var(--border)]">
        <div className="max-w-md mx-auto flex">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                id={`tab-${tab.label.toLowerCase().replace(' ', '-')}`}
                className={`flex-1 flex flex-col items-center justify-center py-4 text-xs font-bold transition-colors duration-150 ${
                  active
                    ? 'text-[var(--foreground)] border-t-2 border-[var(--foreground)] bg-[var(--background)]/20'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="pb-safe" />
      </nav>
    </div>
  );
}
