import { cookies } from 'next/headers';

import { ADMIN_COOKIE, adminSecret, verifySession } from '@/lib/admin-auth';

/** The signed-in admin's username, or null. For route handlers and server components. */
export async function currentAdmin(): Promise<string | null> {
  const store = await cookies();
  return verifySession(store.get(ADMIN_COOKIE)?.value, adminSecret());
}

export const unauthorized = () => Response.json({ error: 'Unauthorized.' }, { status: 401 });
