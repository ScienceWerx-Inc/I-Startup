import { z } from 'zod';
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_S,
  adminSecret,
  isAdminConfigured,
  safeEqual,
  signSession,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(500),
});

function cookieHeader(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** POST /api/admin/login — verifies ADMIN_USERNAME/PASSWORD, sets session cookie. */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: 'Admin credentials not configured. Set ADMIN_USERNAME / ADMIN_PASSWORD.' },
      { status: 503 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Username and password required.' }, { status: 400 });
  }

  const ok =
    safeEqual(parsed.data.username, process.env.ADMIN_USERNAME ?? '') &&
    safeEqual(parsed.data.password, process.env.ADMIN_PASSWORD ?? '');
  if (!ok) {
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const token = await signSession(parsed.data.username, adminSecret());
  return Response.json(
    { ok: true },
    { headers: { 'Set-Cookie': cookieHeader(token, SESSION_MAX_AGE_S) } },
  );
}

/** DELETE /api/admin/login — clears the admin session. */
export async function DELETE() {
  return Response.json(
    { ok: true },
    { headers: { 'Set-Cookie': cookieHeader('', 0) } },
  );
}
