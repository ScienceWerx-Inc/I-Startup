'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Eyebrow, Panel, SiteHeader } from '../components/chrome';

/** Sign-in for returning founders. New founders are sent to "Submit an idea" instead of a sign-up form. */
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only same-site paths, so `?next=` can't bounce a founder to another origin.
  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/interview';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Sign in failed.');
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-mut/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mx-auto w-full max-w-md px-4 py-16 sm:px-6"
      >
        <Panel>
          <Eyebrow>Welcome back</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-mut">Pick up your assessment and report where you left off.</p>
          {error ? (
            <p className="mt-5 rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">{error}</p>
          ) : null}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
              <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </label>
            <Button className="w-full" size="lg" disabled={busy || !email || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign in
            </Button>
          </form>
          <p className="mt-6 border-t border-line pt-5 text-center text-sm text-mut">
            New here?{' '}
            <Link href="/start" className="font-medium text-brand hover:underline">
              Submit your idea
            </Link>{' '}
            to create your account.
          </p>
        </Panel>
      </motion.div>
    </div>
  );
}
