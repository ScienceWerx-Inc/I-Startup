import { userCookieHeader } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/sign-out — clears the founder session. */
export async function POST() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': userCookieHeader('', 0) } });
}
