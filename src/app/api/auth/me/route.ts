import { z } from 'zod';

import { currentUser, getUser, toPublicUser } from '@/lib/account';
import { ensureCompany, setCofounders } from '@/lib/company';
import { col, isDatabaseConfigured } from '@/lib/db';
import { validateCofounders } from '@/modules/istartup-score/onboarding/cofounders';
import { courseAccess, paymentsMode, prices, reportAccess } from '@/lib/payments';
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
    const [report, course] = await Promise.all([reportAccess(user.id), courseAccess(user.id)]);
    return Response.json({ ...base, user: toPublicUser(user), access: { report, course } });
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

  const team = validateCofounders(parsed.data.onboarding.founders, parsed.data.onboarding.cofounders, user.email);
  if (!team.ok) return Response.json({ error: team.error }, { status: 400 });
  const { cofounders: _list, ...onboarding } = parsed.data.onboarding;

  try {
    await col('users').doc(user.id).update({ onboarding });
    const company = await ensureCompany(user.id);
    // Only the lead manages the team; a co-founder's own answers never rewrite it.
    if (company.lead_user_id === user.id) await setCofounders(company.id, team.cofounders, onboarding.startupName);
    const updated = await getUser(user.id);
    if (!updated) return Response.json({ error: 'Sign in first.' }, { status: 401 });
    return Response.json({ user: toPublicUser(updated) });
  } catch (error) {
    console.error('Failed to update onboarding:', error);
    return Response.json({ error: 'Failed to save your answers.' }, { status: 500 });
  }
}
