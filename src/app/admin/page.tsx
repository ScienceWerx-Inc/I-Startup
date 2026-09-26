import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminSecret, verifySession } from '@/lib/admin-auth';
import { Eyebrow, SiteHeader } from '@/modules/istartup-score/components/chrome';
import { AdminDashboard } from './dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const store = await cookies();
  const user = await verifySession(store.get(ADMIN_COOKIE)?.value, adminSecret());
  if (!user) redirect('/admin/login?next=/admin');

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader
        right={
          <span className="font-mono text-[11px] text-mut">
            admin · {user}
          </span>
        }
      />
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <Eyebrow>Admin</Eyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Reports & database
        </h1>
        <p className="mt-1 text-sm text-mut">
          Signed in as <span className="font-mono">{user}</span>. Test Postgres and inspect
          archived iSTARTUP reports.
        </p>
        <div className="mt-6">
          <AdminDashboard />
        </div>
      </div>
    </div>
  );
}
