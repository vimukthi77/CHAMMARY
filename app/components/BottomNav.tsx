'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavIcon, { IconName } from './NavIcon';

export interface NavTab {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * Floating pill tab bar (Dribbble "Tab Menu" style): inactive items are
 * icon-only, the active item expands into a filled pill with its label.
 */
export default function BottomNav({
  tabs,
  idPrefix,
}: {
  tabs: NavTab[];
  idPrefix: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex items-center justify-between gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 backdrop-blur p-1.5 shadow-[0_8px_30px_rgba(78,34,15,0.15)]">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                id={`${idPrefix}${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center justify-center rounded-xl transition-all duration-200 ${
                  active
                    ? 'gap-1.5 bg-[var(--foreground)] text-white px-3 py-2 shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-light)] p-2.5'
                }`}
              >
                <NavIcon name={tab.icon} className="w-5 h-5 shrink-0" />
                {active && (
                  <span className="text-xs font-bold whitespace-nowrap">{tab.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
