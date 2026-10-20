import type { Metadata } from 'next';

import { SiteNav } from '@/modules/istartup-score/components/landing/intel/site-nav';
import { JoinPage } from '@/modules/team/join-page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Join your team · iStartup Score', robots: { index: false } };

export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-paper">
      <SiteNav variant="page" />
      <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-10 sm:px-6">
        <JoinPage token={token} />
      </main>
    </div>
  );
}
