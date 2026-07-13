'use client';

import BottomNav, { NavTab } from '@/app/components/BottomNav';
import ProfileMenu from '@/app/components/ProfileMenu';
import Brand from '@/app/components/Brand';

const tabs: NavTab[] = [
  { href: '/admin', label: 'Overview', icon: 'overview' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
  { href: '/admin/topup', label: 'TopUp', icon: 'wallet' },
  { href: '/admin/meal-prices', label: 'Prices', icon: 'prices' },
  { href: '/admin/requests', label: 'Kitchen', icon: 'kitchen' },
  { href: '/admin/reports', label: 'Reports', icon: 'reports' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-30 bg-[var(--foreground)] text-white">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Brand text="Chammery Admin" textClass="font-bold text-base" />
          <ProfileMenu logoutId="admin-logout-btn" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 pb-28">
        {children}
      </main>

      {/* Bottom tab bar */}
      <BottomNav tabs={tabs} idPrefix="admin-tab-" />
    </div>
  );
}
