import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminSecret, verifySession } from '@/lib/admin-auth';

/**
 * Protects /admin pages (except /admin/login) via the signed session cookie.
 * API auth is enforced inside each admin route handler.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }
  const user = await verifySession(
    request.cookies.get(ADMIN_COOKIE)?.value,
    adminSecret(),
  );
  if (user) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
