import { z } from 'zod';
import { ADMIN_COOKIE, SESSION_MAX_AGE_S, signSession } from '@/lib/admin-auth';
import { adminSecret, authenticateAdmin } from '@/lib/admin-guard';

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

/** POST /api/admin/login — verifies an admin account (env or Firestore), sets session cookie. */
export async function POST(request: Request) {
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

  let username: string | null;
  try {
    username = await authenticateAdmin(parsed.data.username, parsed.data.password);
  } catch (error) {
    console.error('Admin login failed:', error);
    return Response.json({ error: 'Could not sign you in. Please try again.' }, { status: 500 });
  }
  if (!username) {
    return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const token = await signSession(username, await adminSecret());
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
