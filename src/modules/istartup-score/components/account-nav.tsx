'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { useAccount } from '@/hooks/use-account';
import { cn } from '@/lib/utils';

/**
 * Header actions. There is deliberately no "Sign up" button: accounts are created at the
 * end of the "Submit an idea" onboarding.
 */
export function AccountNav({ cta = true }: { cta?: boolean }) {
  const { user, isLoading, signOut } = useAccount();

  if (isLoading) return <span className="h-9 w-40" aria-hidden />;

  if (!user) {
    return (
      <>
        <Link href="/sign-in" className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
          Sign in
        </Link>
        {cta ? (
          <Link href="/start" className={buttonVariants({ size: 'sm' })}>
            Submit an idea
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      {cta ? (
        <Link href="/interview" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
          My assessment
        </Link>
      ) : null}
      <span className="hidden max-w-[160px] truncate text-sm text-ink sm:inline" title={user.email}>
        {user.fullName.split(' ')[0] || user.email}
      </span>
      <button
        type="button"
        onClick={signOut}
        className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }), 'px-2')}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </>
  );
}
