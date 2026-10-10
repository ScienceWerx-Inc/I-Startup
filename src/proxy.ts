import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminSecret, verifySession } from '@/lib/admin-auth';
import { USER_COOKIE, verifyUserSession } from '@/lib/user-auth';

/**
 * Protects /admin pages (except /admin/login) via the signed admin cookie, and the
 * assessment (/interview) via the founder session — signed-out visitors go through the
 * "Submit an idea" onboarding, which is where accounts are created.
 * API auth is enforced inside each route handler.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/interview' || pathname.startsWith('/interview/')) {
    const userId = await verifyUserSession(request.cookies.get(USER_COOKIE)?.value);
    if (userId) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/start';
    url.search = '';
    return NextResponse.redirect(url);
  }

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
  matcher: ['/admin/:path*', '/interview/:path*'],
};
