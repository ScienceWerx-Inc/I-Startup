'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, ListOrdered, LogOut, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Panel } from '@/modules/istartup-score/components/chrome';

interface DbTest {
  configured: boolean;
  connected?: boolean;
  tableExists?: boolean;
  count?: number;
  latest?: Array<{
    id: string;
    app_id: string | null;
    startup_name: string;
    final_score: number;
    band: string;
    created_at: string;
  }>;
  error?: string;
}

interface Report {
  id: string;
  app_id: string | null;
  startup_name: string;
  final_score: number;
  band: string;
  created_at: string;
}

export function AdminDashboard() {
  const router = useRouter();
  const [db, setDb] = useState<DbTest | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState<'db' | 'reports' | 'logout' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testDb = async () => {
    setBusy('db');
    setError(null);
    try {
      const res = await fetch('/api/admin/db-test');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'DB test failed.');
      setDb(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'DB test failed.');
    } finally {
      setBusy(null);
    }
  };

  const loadReports = async () => {
    setBusy('reports');
    setError(null);
    try {
      const res = await fetch('/api/reports?limit=20');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load reports.');
      setReports(data.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports.');
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    setBusy('logout');
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">
          {error}
        </p>
      ) : null}

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Database className="h-4 w-4 text-brand" /> Database
            </h2>
            <p className="mt-0.5 text-sm text-mut">
              Tests <span className="font-mono">POSTGRES_URL</span> connectivity and the{' '}
              <span className="font-mono">istartup_reports</span> table.
            </p>
          </div>
          <Button size="sm" onClick={testDb} disabled={busy === 'db'}>
            <RefreshCw className="h-3.5 w-3.5" /> {busy === 'db' ? 'Testing…' : 'Test connection'}
          </Button>
        </div>
        {db ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-paper p-3">
              <dt className="text-mut">Configured</dt>
              <dd className="mt-1 font-semibold text-ink">{String(db.configured)}</dd>
            </div>
            <div className="rounded-lg bg-paper p-3">
              <dt className="text-mut">Connected</dt>
              <dd className="mt-1 font-semibold text-ink">{String(db.connected ?? '—')}</dd>
            </div>
            <div className="rounded-lg bg-paper p-3">
              <dt className="text-mut">Table</dt>
              <dd className="mt-1 font-semibold text-ink">{String(db.tableExists ?? '—')}</dd>
            </div>
            <div className="rounded-lg bg-paper p-3">
              <dt className="text-mut">Rows</dt>
              <dd className="mt-1 font-semibold text-ink">{db.count ?? '—'}</dd>
            </div>
          </dl>
        ) : null}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <ListOrdered className="h-4 w-4 text-brand" /> Recent reports
            </h2>
            <p className="mt-0.5 text-sm text-mut">Newest first, from Vercel Postgres.</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadReports} disabled={busy === 'reports'}>
            {busy === 'reports' ? 'Loading…' : 'Load reports'}
          </Button>
        </div>
        {reports ? (
          reports.length === 0 ? (
            <p className="mt-4 text-sm text-mut">No reports stored yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-mut">
                  <th className="py-2 pr-3">Startup</th>
                  <th className="py-2 pr-3">App</th>
                  <th className="py-2 pr-3 text-right">Score</th>
                  <th className="py-2 pr-3">Band</th>
                  <th className="py-2 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-medium text-ink">{r.startup_name || '—'}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-mut">{r.app_id ?? '—'}</td>
                    <td className="py-2 pr-3 text-right font-mono font-semibold text-ink tabular">
                      {r.final_score}
                    </td>
                    <td className="py-2 pr-3 text-mut">{r.band}</td>
                    <td className="py-2 text-right font-mono text-xs text-mut">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </Panel>

      <div>
        <Button variant="ghost" size="sm" onClick={logout} disabled={busy === 'logout'}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </div>
  );
}
