'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Eyebrow, Panel, SiteHeader } from '@/modules/istartup-score/components/chrome';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Login failed.');
      router.push(searchParams.get('next') ?? '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-mut/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
        <Panel>
          <Eyebrow>Admin</Eyebrow>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
            <Lock className="h-5 w-5 text-brand" /> Sign in
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-mut">
            Uses <span className="font-mono">ADMIN_USERNAME</span> /{' '}
            <span className="font-mono">ADMIN_PASSWORD</span> from Vercel env.
          </p>
          {error ? (
            <p className="mt-5 rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">
              {error}
            </p>
          ) : null}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Username</span>
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Password</span>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <Button className="w-full" size="lg" disabled={busy || !username || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
