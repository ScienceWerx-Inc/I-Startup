import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { lms } from '@/brico/lms';
import { getUser } from '@/lib/account';
import { createFounderAccount } from '@/lib/account-create';
import { col, db, nowIso } from '@/lib/db';
import type { Cofounder } from '@/modules/istartup-score/onboarding/cofounders';

/**
 * A startup as a company with a team. The founder who signs up is its lead; when the
 * startup has more founders, the lead lists them (name, email, phone) and each gets a
 * personal invite link. A co-founder who accepts gets their own account, enrolment, quiz
 * shuffle, grade and 411 Certificate on the company's courses.
 *
 * Invite links carry `{companyId}.{memberId}.{secret}`; only a SHA-256 of the secret is
 * stored, and it is cleared once used, so a link works once and a leaked database does not
 * leak working links.
 */

export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'lead' | 'cofounder';
  user_id: string | null;
  invite_hash: string | null;
  invited_at: string | null;
  joined_at: string | null;
}

export interface Company {
  id: string;
  name: string;
  lead_user_id: string;
  members: CompanyMember[];
  created_at: string;
  updated_at: string;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const ref = (id: string) => col('companies').doc(id);

export async function getCompany(id: string): Promise<Company | null> {
  const snap = await ref(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Company) : null;
}

/** The company a user belongs to (lead or co-founder), or null. */
export async function companyForUser(userId: string): Promise<Company | null> {
  const snap = await col('users').doc(userId).get();
  const companyId = snap.exists ? (snap.get('company_id') as string | undefined) : undefined;
  return companyId ? getCompany(companyId) : null;
}

/**
 * The user's company, created on first need with them as its lead — so founders who
 * signed up before companies existed get one the first time anything asks.
 */
export async function ensureCompany(userId: string): Promise<Company> {
  return db().runTransaction(async (tx) => {
    const userRef = col('users').doc(userId);
    const user = await tx.get(userRef);
    if (!user.exists) throw new Error('No such user.');
    const existing = user.get('company_id') as string | undefined;
    if (existing) {
      const snap = await tx.get(ref(existing));
      if (snap.exists) return { id: snap.id, ...snap.data() } as Company;
    }
    const now = nowIso();
    const id = randomUUID();
    const onboarding = (user.get('onboarding') ?? {}) as { startupName?: string };
    const company: Omit<Company, 'id'> = {
      name: onboarding.startupName?.trim() || 'Untitled startup',
      lead_user_id: userId,
      members: [
        {
          id: randomUUID(),
          name: (user.get('full_name') as string) || (user.get('email') as string),
          email: user.get('email') as string,
          phone: null,
          role: 'lead',
          user_id: userId,
          invite_hash: null,
          invited_at: null,
          joined_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };
    tx.create(ref(id), company);
    tx.update(userRef, { company_id: id });
    return { id, ...company };
  });
}

/**
 * Replaces the co-founder list, keeping every existing member whose email is still listed
 * (and any who already joined, so nobody loses their course by an edit).
 */
export async function setCofounders(companyId: string, cofounders: Cofounder[], name?: string): Promise<Company> {
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref(companyId));
    if (!snap.exists) throw new Error('No such company.');
    const company = { id: snap.id, ...snap.data() } as Company;
    const byEmail = new Map(company.members.filter((m) => m.role === 'cofounder').map((m) => [m.email, m]));
    const listed = cofounders.map((c): CompanyMember => {
      const kept = byEmail.get(c.email);
      return kept
        ? { ...kept, name: c.name, phone: c.phone }
        : { id: randomUUID(), name: c.name, email: c.email, phone: c.phone, role: 'cofounder', user_id: null, invite_hash: null, invited_at: null, joined_at: null };
    });
    const listedEmails = new Set(listed.map((m) => m.email));
    const joinedUnlisted = company.members.filter((m) => m.role === 'cofounder' && m.user_id && !listedEmails.has(m.email));
    const members = [...company.members.filter((m) => m.role === 'lead'), ...listed, ...joinedUnlisted];
    const next = { members, updated_at: nowIso(), ...(name?.trim() ? { name: name.trim() } : {}) };
    tx.update(ref(companyId), next);
    return { ...company, ...next };
  });
}

export function isMember(company: Company | null, userId: string): boolean {
  return Boolean(company?.members.some((m) => m.user_id === userId));
}

/** Joined members' user ids, lead first. */
export const memberUserIds = (company: Company) =>
  company.members.filter((m) => m.user_id).map((m) => m.user_id!) as string[];

/* ─────────────────────────────── invites ─────────────────────────────── */

/** A fresh invite link token for a co-founder who hasn't joined; any older link stops working. */
export async function createInvite(companyId: string, memberId: string): Promise<string> {
  const secret = randomBytes(24).toString('base64url');
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref(companyId));
    const company = snap.data() as Company | undefined;
    const member = company?.members.find((m) => m.id === memberId);
    if (!company || !member || member.role !== 'cofounder') throw new Error('No such co-founder.');
    if (member.user_id) throw new Error('This co-founder has already joined.');
    tx.update(ref(companyId), {
      members: company.members.map((m) => (m.id === memberId ? { ...m, invite_hash: sha256(secret), invited_at: nowIso() } : m)),
      updated_at: nowIso(),
    });
  });
  return `${companyId}.${memberId}.${secret}`;
}

function parseToken(token: string) {
  const [companyId, memberId, secret] = token.split('.');
  return companyId && memberId && secret ? { companyId, memberId, secret } : null;
}

const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** What an invite page shows, or null for a link that is wrong, used or replaced. */
export async function inviteInfo(token: string) {
  const t = parseToken(token);
  if (!t) return null;
  const company = await getCompany(t.companyId);
  const member = company?.members.find((m) => m.id === t.memberId);
  if (!company || !member?.invite_hash || member.user_id || !sameHash(member.invite_hash, sha256(t.secret))) return null;
  const lead = company.members.find((m) => m.role === 'lead');
  return { company, member, leadName: lead?.name ?? '' };
}

export class InviteError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

/**
 * Accepts an invite: as the signed-in user, or by creating the co-founder's account with
 * the invited email. Marks the member joined, then enrols them in every ready company course.
 */
export async function redeemInvite(input: { token: string; password?: string; signedInUserId?: string | null }) {
  const info = await inviteInfo(input.token);
  if (!info) throw new InviteError('This invite link is not valid any more. Ask your lead founder for a new one.', 404);
  const { company, member } = info;

  let userId = input.signedInUserId ?? null;
  let fullName = member.name;
  if (userId) {
    const existing = await getUser(userId);
    // An account that is already a team, or already assessed its own startup, can't switch.
    // A lone account with no reports (someone who signed up before being invited) can.
    const theirs = await companyForUser(userId);
    if (theirs && theirs.id !== company.id) {
      const hasReports = !(await col('reports').where('user_id', '==', userId).limit(1).get()).empty;
      if (theirs.members.length > 1 || hasReports) {
        throw new InviteError('This account already belongs to another startup.', 409);
      }
    }
    fullName = existing?.full_name || member.name;
  } else {
    if (!input.password || input.password.length < 8) throw new InviteError('Use a password of at least 8 characters.', 400);
    const lead = await getUser(company.lead_user_id);
    const { cofounders: _c, role: _r, ...onboarding } = (lead?.onboarding ?? {}) as Record<string, string>;
    const created = await createFounderAccount({
      fullName: member.name,
      email: member.email,
      password: input.password,
      onboarding,
      companyId: company.id,
    });
    if (!created.ok) throw new InviteError('An account with this email already exists. Sign in, then open the link again.', 409);
    userId = created.user.id;
  }

  const t = parseToken(input.token)!;
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref(company.id));
    const current = snap.data() as Company;
    const m = current.members.find((x) => x.id === t.memberId);
    if (!m?.invite_hash || m.user_id || !sameHash(m.invite_hash, sha256(t.secret))) {
      throw new InviteError('This invite link was just used.', 409);
    }
    tx.update(ref(company.id), {
      members: current.members.map((x) => (x.id === t.memberId ? { ...x, user_id: userId, joined_at: nowIso(), invite_hash: null } : x)),
      updated_at: nowIso(),
    });
    tx.update(col('users').doc(userId!), { company_id: company.id });
  });

  await enrollInCompanyCourses(company.id, userId!);
  return { userId: userId!, fullName };
}

/** Enrols a member in every published course of their company (idempotent). */
export async function enrollInCompanyCourses(companyId: string, userId: string): Promise<void> {
  const jobs = await col('courseJobs').where('company_id', '==', companyId).get();
  await Promise.all(
    jobs.docs
      .filter((d) => d.get('status') === 'ready')
      .map(async (d) => {
        const result = await lms().enroll({ courseId: d.get('course_id') as string, userId, source: 'invite' });
        if (!result.ok && result.code !== 'already_enrolled') console.error('Co-founder enrol failed:', result.message);
      }),
  );
}
