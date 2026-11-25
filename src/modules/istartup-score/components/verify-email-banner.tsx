'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; text: string } | { kind: 'error'; text: string };

/**
 * A thin strip under the navigation for a signed-in founder who hasn't confirmed their
 * email: one button to send the link again. `?email=invalid` (from an expired or wrong
 * link) says so.
 */
export function VerifyEmailBanner({ email, className }: { email: string; className?: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [badLink, setBadLink] = useState(false);

  useEffect(() => {
    // Read once on mount; the verify route sends founders back with ?email=invalid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBadLink(new URLSearchParams(window.location.search).get('email') === 'invalid');
  }, []);

  const resend = async () => {
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/auth/verify-email/resend', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not send the email.');
      setState({ kind: 'sent', text: `Sent. Check ${email} for the link.` });
    } catch (error) {
      setState({ kind: 'error', text: error instanceof Error ? error.message : 'Could not send the email.' });
    }
  };

  return (
    <div role="status" className={cn('border-t border-line bg-mist/70', className)}>
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[13px] text-ink sm:px-6">
        <span className="font-semibold">Verify your email.</span>
        <span className="text-mut">
          {badLink ? 'That link has expired or is not valid. ' : ''}
          We sent a link to {email}. Confirming it lets your other ScienceWerx apps show your results here.
        </span>
        {state.kind === 'sent' || state.kind === 'error' ? (
          <span className={state.kind === 'error' ? 'text-risk' : 'text-good'}>{state.text}</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={state.kind === 'sending'}
            className="font-medium text-brand underline-offset-2 hover:underline disabled:opacity-60"
          >
            {state.kind === 'sending' ? 'Sending…' : 'Send the link again'}
          </button>
        )}
      </div>
    </div>
  );
}
