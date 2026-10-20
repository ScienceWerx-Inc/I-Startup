'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Users } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Panel } from '@/modules/istartup-score/components/chrome';

/** A co-founder accepting their invite: set a password (or use the account they're signed into). */
export function JoinPage({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<{ company: string; lead: string; name: string; email: string; signedIn: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/join?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => alive && (ok ? setInfo(d) : setError(d.error ?? 'This invite link is not valid.')))
      .catch(() => alive && setError('Could not open this invite.'));
    return () => {
      alive = false;
    };
  }, [token]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info?.signedIn ? { token } : { token, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Could not accept the invite.');
      router.push('/learn');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the invite.');
      setBusy(false);
    }
  };

  if (!info) {
    return (
      <Panel className="text-center">
        {error ? (
          <>
            <p className="text-lg font-semibold text-ink">Invite not valid</p>
            <p className="mt-1 text-sm text-mut">{error}</p>
            <Link href="/sign-in" className={buttonVariants({ variant: 'outline', className: 'mt-5' })}>
              Sign in
            </Link>
          </>
        ) : (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mut">
        <Users className="h-3.5 w-3.5" /> Co-founder invite
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Join {info.company}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-mut">
        {info.lead} added you, {info.name}, as a co-founder. You&apos;ll take the company&apos;s gap-closing course on your own
        account, with your own grade and 411 Certificate.
      </p>
      <form onSubmit={accept} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
          <input value={info.email} readOnly className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[15px] text-mut" />
        </label>
        {info.signedIn ? (
          <p className="text-sm text-mut">You&apos;re signed in; accepting adds this account to the team.</p>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Choose a password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
        )}
        {error ? <p className="text-sm text-risk">{error}</p> : null}
        <Button type="submit" disabled={busy || (!info.signedIn && password.length < 8)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Accept and join
        </Button>
      </form>
    </Panel>
  );
}
