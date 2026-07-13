'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavIcon from './NavIcon';

interface Me {
  fullName: string;
  workEmail: string;
  role: 'admin' | 'staff';
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

/**
 * Replaces the old "Sign out" text link: a round avatar button that opens a
 * panel showing the signed-in user's name, email and the sign-out action.
 */
export default function ProfileMenu({ logoutId }: { logoutId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMe(data))
      .catch(() => {});
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore — navigate away regardless */
    }
    window.location.assign('/login');
  }

  const name = me?.fullName ?? '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-xs font-black ring-2 ring-white/20 hover:ring-white/40 transition-all cursor-pointer"
      >
        {name ? initials(name) : <NavIcon name="user" className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl p-4 z-50 origin-top-right">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center text-sm font-black shrink-0">
              {name ? initials(name) : <NavIcon name="user" className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-[var(--foreground)] truncate">
                {name || 'Loading…'}
              </p>
              <p className="text-xs text-[var(--muted)] truncate">{me?.workEmail ?? ''}</p>
            </div>
          </div>

          {me && (
            <span className="inline-block mt-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--accent-light)] text-[var(--accent)]">
              {me.role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
          )}

          <div className="border-t border-[var(--border)] my-3" />

          <button
            id={logoutId}
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-red-200 bg-red-50/60 text-red-700 text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <NavIcon name="logout" className="w-4 h-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
