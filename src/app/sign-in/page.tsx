import type { Metadata } from 'next';
import { Suspense } from 'react';

import SignInPage from '@/modules/istartup-score/app/sign-in';

export const metadata: Metadata = { title: 'Sign in | iSTARTUP Score' };

export default function SignIn() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <SignInPage />
    </Suspense>
  );
}
