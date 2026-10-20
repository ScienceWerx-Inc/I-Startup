'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Link2, Loader2, UserCheck, Users } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eyebrow, Panel } from '@/modules/istartup-score/components/chrome';

/**
 * The founder's team: everyone at the company, who has joined, and — for the lead — a
 * personal invite link per co-founder to copy and send. Each co-founder who joins takes
 * the company's course with their own quiz order, grade and 411 Certificate.
 */

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'lead' | 'cofounder';
  joined: boolean;
  joinedAt: string | null;
  invited: boolean;
  you: boolean;
}
interface Team {
  id: string;
  name: string;
  isLead: boolean;
  members: Member[];
}

export function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => fetch('/api/team', { cache: 'no-store' }).then((r) => r.json()), []);
  useEffect(() => {
    let alive = true;
    load().then(
      (d) => alive && (d.company ? setTeam(d.company) : setError(d.error ?? 'Could not load your team.')),
      () => alive && setError('Could not load your team.'),
    );
    return () => {
      alive = false;
    };
  }, [load]);

  const invite = async (memberId: string) => {
    setBusy(memberId);
    setError(null);
    try {
      const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'invite', memberId }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Could not create the link.');
      setLinks((l) => ({ ...l, [memberId]: d.link }));
      const fresh = await load();
      if (fresh.company) setTeam(fresh.company);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the link.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (memberId: string) => {
    try {
      await navigator.clipboard.writeText(links[memberId]);
      setCopied(memberId);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* the link stays selectable in the field */
    }
  };

  if (!team) return <p className="text-sm text-mut">{error ?? <Loader2 className="h-4 w-4 animate-spin" />}</p>;
  const cofounders = team.members.filter((m) => m.role === 'cofounder');

  return (
    <>
      <Eyebrow>Your team</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{team.name}</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mut">
        Every founder takes the company&apos;s course on their own account: their own quiz order, their own grade, and their
        own 411 Certificate. The company&apos;s Readiness Certificate covers the startup as a whole.
      </p>

      <Panel className="mt-8 p-0 sm:p-0">
        <ul className="divide-y divide-line">
          {team.members.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
                  {m.name}
                  {m.role === 'lead' ? <span className="rounded-full bg-tech-soft px-2 py-0.5 text-[11px] font-semibold text-tech">Lead</span> : null}
                  {m.you ? <span className="text-xs text-mut">(you)</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-mut">
                  {m.email}
                  {m.phone ? ` · ${m.phone}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                {m.joined ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-good">
                    <UserCheck className="h-4 w-4" /> Joined
                  </span>
                ) : team.isLead ? (
                  <Button size="sm" variant={m.invited ? 'outline' : 'default'} onClick={() => invite(m.id)} disabled={busy === m.id}>
                    {busy === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    {m.invited ? 'New invite link' : 'Create invite link'}
                  </Button>
                ) : (
                  <span className="text-sm text-mut">Invited</span>
                )}
              </div>
              {links[m.id] ? (
                <div className="flex w-full items-center gap-2 sm:basis-full">
                  <input readOnly value={links[m.id]} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-line-strong bg-paper px-3 py-2 font-mono text-xs text-ink" />
                  <Button size="sm" variant="outline" onClick={() => copy(m.id)}>
                    {copied === m.id ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />} {copied === m.id ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      {team.isLead ? (
        <p className="mt-4 text-sm text-mut">
          {cofounders.length
            ? 'Send each co-founder their own link. A link works once; creating a new one replaces the old.'
            : 'Solo for now. '}
          {' '}
          <Link href="/start" className="font-medium text-brand hover:underline">
            {cofounders.length ? 'Edit co-founders' : 'Add co-founders'}
          </Link>{' '}
          in your startup details.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-risk">{error}</p> : null}
      <div className={cn('mt-8')}>
        <Link href="/learn" className={buttonVariants({ variant: 'outline' })}>
          <Users className="h-4 w-4" /> Go to the courses
        </Link>
      </div>
    </>
  );
}
