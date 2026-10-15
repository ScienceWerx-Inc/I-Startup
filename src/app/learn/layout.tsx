import type { ReactNode } from 'react';

import { SiteNav } from '@/modules/istartup-score/components/landing/intel/site-nav';

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <SiteNav variant="page" />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}
