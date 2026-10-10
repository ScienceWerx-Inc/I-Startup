import { sql } from '@vercel/postgres';
import { z } from 'zod';

import { currentUser, toPublicUser, type UserRow } from '@/lib/account';
import { isDatabaseConfigured } from '@/lib/db';
import { entitlements, paymentsMode, prices } from '@/lib/payments';
import { OnboardingSchema } from '@/modules/istartup-score/onboarding/fields';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/me — the signed-in founder (or null), what they own, and current prices. */
export async function GET() {
  const base = { prices: prices(), payments: paymentsMode() };
  if (!isDatabaseConfigured()) {
    return Response.json({ ...base, user: null, access: { report: false, course: false } });
  }
  try {
    const user = await currentUser();
    if (!user) return Response.json({ ...base, user: null, access: { report: false, course: false } });
    return Response.json({ ...base, user: toPublicUser(user), access: await entitlements(user.id) });
  } catch (error) {
    console.error('Failed to load account:', error);
    return Response.json({ error: 'Failed to load account.' }, { status: 500 });
  }
}

const PatchSchema = z.object({ onboarding: OnboardingSchema });

/** PATCH /api/auth/me — replaces the onboarding answers (a signed-in founder submitting a new idea). */
export async function PATCH(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid onboarding answers.' }, { status: 400 });

  try {
    const { rows } = await sql<UserRow>`
      UPDATE istartup_users SET onboarding = ${JSON.stringify(parsed.data.onboarding)}::jsonb
      WHERE id = ${user.id}::uuid
      RETURNING id, email, full_name, onboarding, created_at;
    `;
    return Response.json({ user: toPublicUser(rows[0]) });
  } catch (error) {
    console.error('Failed to update onboarding:', error);
    return Response.json({ error: 'Failed to save your answers.' }, { status: 500 });
  }
}
