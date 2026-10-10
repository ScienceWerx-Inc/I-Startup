'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { OnboardingAnswers } from '@/modules/istartup-score/onboarding/fields';

/** Client view of `/api/auth/me`. */

export interface AccountUser {
  id: string;
  email: string;
  fullName: string;
  onboarding: OnboardingAnswers;
}

export interface ProductPrice {
  name: string;
  description: string;
  amountCents: number;
  currency: string;
}

export interface Account {
  user: AccountUser | null;
  access: { report: boolean; course: boolean };
  prices: { report: ProductPrice; course: ProductPrice };
  payments: 'stripe' | 'mock' | 'disabled';
}

export function formatPrice(p: ProductPrice): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: p.currency.toUpperCase(),
    minimumFractionDigits: p.amountCents % 100 === 0 ? 0 : 2,
  }).format(p.amountCents / 100);
}

async function loadAccount(): Promise<Account | null> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    return res.ok ? ((await res.json()) as Account) : null;
  } catch {
    return null;
  }
}

export function useAccount() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadAccount().then((a) => {
      if (!alive) return;
      setAccount(a);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refresh = useCallback(async () => setAccount(await loadAccount()), []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    setAccount(null);
    router.push('/');
    router.refresh();
  }, [router]);

  return { account, user: account?.user ?? null, isLoading, refresh, setAccount, signOut };
}
