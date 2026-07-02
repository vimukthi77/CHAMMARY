'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/topup', label: 'TopUp' },
  { href: '/admin/meal-prices', label: 'Prices' },
  { href: '/admin/requests', label: 'Kitchen' },
  { href: '/admin/reports', label: 'Reports' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 bg-[var(--foreground)] text-white">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-bold text-base">Chammery Admin</span>
          </div>
          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            className="text-sm font-semibold text-[var(--muted)] hover:text-white transition-colors duration-150"
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
                id={`admin-tab-${tab.label.toLowerCase()}`}
                className={`flex-1 flex flex-col items-center justify-center py-4 text-[10px] font-bold transition-colors duration-150 ${
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
