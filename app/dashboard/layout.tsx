'use client';

import BottomNav, { NavTab } from '@/app/components/BottomNav';
import ProfileMenu from '@/app/components/ProfileMenu';
import Brand from '@/app/components/Brand';

const tabs: NavTab[] = [
  { href: '/dashboard', label: 'Order', icon: 'order' },
  { href: '/dashboard/history', label: 'History', icon: 'history' },
  { href: '/dashboard/wallet-history', label: 'Top-Ups', icon: 'wallet' },
  { href: '/dashboard/summary', label: 'Stats', icon: 'stats' },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--background)]">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Brand text="Chammery" textClass="font-bold text-[var(--foreground)] text-base" />
          <ProfileMenu logoutId="logout-btn" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 pb-28">
        {children}
      </main>

      {/* Bottom tab bar */}
      <BottomNav tabs={tabs} idPrefix="tab-" />
    </div>
  );
}
