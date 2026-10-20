import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { sessionUserId } from '@/lib/account';
import { SiteNav } from '@/modules/istartup-score/components/landing/intel/site-nav';
import { TeamPage } from '@/modules/team/team-page';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your team · iStartup Score' };

export default async function Team() {
  if (!(await sessionUserId())) redirect('/start');
  return (
    <div className="min-h-screen bg-paper">
      <SiteNav variant="page" />
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <TeamPage />
      </main>
    </div>
  );
}
