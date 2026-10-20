import { z } from 'zod';

import { currentUser } from '@/lib/account';
import { createInvite, ensureCompany, type Company } from '@/lib/company';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A company as its members may see it: never an invite hash. */
function publicCompany(company: Company, viewerId: string) {
  return {
    id: company.id,
    name: company.name,
    isLead: company.lead_user_id === viewerId,
    members: company.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      role: m.role,
      joined: Boolean(m.user_id),
      joinedAt: m.joined_at,
      invited: Boolean(m.invite_hash),
      invitedAt: m.invited_at,
      you: m.user_id === viewerId,
    })),
  };
}

/** GET /api/team — the signed-in founder's company and its members. */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const company = await ensureCompany(user.id);
  return Response.json({ company: publicCompany(company, user.id) });
}

const PostSchema = z.object({ op: z.literal('invite'), memberId: z.string().uuid() });

/** POST /api/team {op:'invite', memberId} — the lead gets a fresh invite link for a co-founder. */
export async function POST(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = PostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const company = await ensureCompany(user.id);
  if (company.lead_user_id !== user.id) return Response.json({ error: 'Only the lead founder can invite.' }, { status: 403 });
  try {
    const token = await createInvite(company.id, parsed.data.memberId);
    const origin = process.env.APP_URL || new URL(request.url).origin;
    return Response.json({ link: `${origin}/join/${token}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create the invite.' }, { status: 409 });
  }
}
