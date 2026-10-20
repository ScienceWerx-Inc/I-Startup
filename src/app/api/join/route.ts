import { z } from 'zod';

import { sessionUserId, toPublicUser, getUser } from '@/lib/account';
import { InviteError, inviteInfo, redeemInvite } from '@/lib/company';
import { signUserSession, userCookieHeader } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Token = z.string().min(20).max(300);

/** GET /api/join?token= — what an invite is for (company, lead, the invited name and email). */
export async function GET(request: Request) {
  const token = Token.safeParse(new URL(request.url).searchParams.get('token'));
  if (!token.success) return Response.json({ error: 'Invalid invite.' }, { status: 400 });
  const info = await inviteInfo(token.data);
  if (!info) return Response.json({ error: 'This invite link is not valid any more.' }, { status: 404 });
  return Response.json({
    company: info.company.name,
    lead: info.leadName,
    name: info.member.name,
    email: info.member.email,
    signedIn: Boolean(await sessionUserId()),
  });
}

const PostSchema = z.object({ token: Token, password: z.string().min(8).max(200).optional() });

/** POST /api/join — accept the invite (as the signed-in account, or by creating one). */
export async function POST(request: Request) {
  const parsed = PostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Use a password of at least 8 characters.' }, { status: 400 });
  const signedIn = await sessionUserId();
  try {
    const { userId } = await redeemInvite({ token: parsed.data.token, password: parsed.data.password, signedInUserId: signedIn });
    const user = await getUser(userId);
    const headers = signedIn ? undefined : { 'Set-Cookie': userCookieHeader(await signUserSession(userId)) };
    return Response.json({ user: user ? toPublicUser(user) : null }, { status: 201, headers });
  } catch (error) {
    if (error instanceof InviteError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Invite redeem failed:', error);
    return Response.json({ error: 'Could not accept the invite. Please try again.' }, { status: 500 });
  }
}
