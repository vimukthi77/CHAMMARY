import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = await getSessionUserFromRequest(req);

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // ── Staff-protected routes ────────────────────────────────────────────────
  const staffRoutes = ['/dashboard', '/history'];
  if (staffRoutes.some((r) => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // ── Auth pages — redirect logged-in users away ────────────────────────────
  if (pathname === '/login' || pathname === '/register') {
    if (user) {
      const dest = user.role === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Next.js 16 compatibility alias
export { middleware as proxy };

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/history/:path*', '/login', '/register'],
};
