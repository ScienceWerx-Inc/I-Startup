'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Database,
  FileText,
  Globe2,
  ListOrdered,
  LogOut,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { QUESTIONS } from '@/modules/istartup-score/assessment/bank';
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

interface ReportSummary {
  id: string;
  app_id: string | null;
  startup_name: string;
  final_score: number;
  band: string;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}

interface ReportDetail extends ReportSummary {
  profile: Record<string, unknown>;
  company_info: unknown;
  answers: Record<string, number>;
  scores: Array<{ category: string; score: number }>;
}

interface Stats {
  total: number;
  avgScore: number;
  byBand: Array<{ label: string; count: number }>;
  byCountry: Array<{ label: string; count: number }>;
  byCity: Array<{ label: string; count: number }>;
  byDay: Array<{ day: string; count: number }>;
  dimAvg: Array<{ label: string; avg: number }>;
  note: string;
}

function Bars({ rows, max, suffix = '' }: { rows: Array<{ label: string; count: number }>; max: number; suffix?: string }) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-mut">No data yet.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[140px_1fr_44px] items-center gap-3 text-sm">
          <span className="truncate text-ink">{r.label || 'Unknown'}</span>
          <span className="h-2 rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${max > 0 ? (r.count / max) * 100 : 0}%` }}
            />
          </span>
          <span className="text-right font-mono text-xs font-semibold text-ink tabular">
            {r.count}{suffix}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [db, setDb] = useState<DbTest | null>(null);
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [busy, setBusy] = useState<'db' | 'reports' | 'stats' | 'detail' | 'logout' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testDb = useCallback(async () => {
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
  }, []);

  const loadReports = useCallback(async () => {
    setBusy('reports');
    setError(null);
    try {
      const res = await fetch('/api/reports?limit=50');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load reports.');
      setReports(data.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports.');
    } finally {
      setBusy(null);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setBusy('stats');
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load stats.');
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats.');
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    testDb();
    loadReports();
    loadStats();
  }, [testDb, loadReports, loadStats]);

  const openDetail = async (id: string) => {
    setBusy('detail');
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load report.');
      setDetail(data.report);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report.');
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

  if (detail) return <ReportDetailView report={detail} onBack={() => setDetail(null)} onLogout={logout} />;

  const maxBand = Math.max(0, ...(stats?.byBand.map((b) => b.count) ?? [0]));
  const maxCountry = Math.max(0, ...(stats?.byCountry.map((b) => b.count) ?? [0]));

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">
          {error}
        </p>
      ) : null}

      {/* ── Overview ── */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <BarChart3 className="h-4 w-4 text-brand" /> Overview
          </h2>
          <Button size="sm" variant="outline" onClick={loadStats} disabled={busy === 'stats'}>
            <RefreshCw className="h-3.5 w-3.5" /> {busy === 'stats' ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
        {stats ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Reports', value: String(stats.total) },
                { label: 'Avg score / 500', value: String(stats.avgScore) },
                { label: 'Top band', value: stats.byBand[0]?.label ?? '—' },
                { label: 'Top country', value: stats.byCountry[0]?.label ?? '—' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-paper p-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-mut">{s.label}</p>
                  <p className="mt-1 truncate text-lg font-semibold text-ink" title={s.value}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">By readiness band</h3>
                <Bars rows={stats.byBand} max={maxBand} />
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Globe2 className="h-3.5 w-3.5 text-mut" /> By country
                </h3>
                <Bars rows={stats.byCountry} max={maxCountry} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Avg dimension score (%)</h3>
                <Bars rows={stats.dimAvg.map((d) => ({ label: d.label, count: d.avg }))} max={100} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Top cities</h3>
                <Bars rows={stats.byCity.slice(0, 8)} max={Math.max(0, ...stats.byCity.map((c) => c.count), 0)} />
              </div>
            </div>
            <p className="mt-5 text-xs text-mut">{stats.note}</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-mut">{busy === 'stats' ? 'Loading…' : 'No stats yet.'}</p>
        )}
      </Panel>

      {/* ── Database ── */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Database className="h-4 w-4 text-brand" /> Database
            </h2>
            <p className="mt-0.5 text-sm text-mut">
              <span className="font-mono">POSTGRES_URL</span> connectivity and the{' '}
              <span className="font-mono">istartup_reports</span> table.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={testDb} disabled={busy === 'db'}>
            <RefreshCw className="h-3.5 w-3.5" /> {busy === 'db' ? 'Testing…' : 'Test connection'}
          </Button>
        </div>
        {db ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
            {[
              { k: 'Configured', v: String(db.configured) },
              { k: 'Connected', v: String(db.connected ?? '—') },
              { k: 'Table', v: String(db.tableExists ?? '—') },
              { k: 'Rows', v: String(db.count ?? '—') },
            ].map((d) => (
              <div key={d.k} className="rounded-lg bg-paper p-3">
                <dt className="text-mut">{d.k}</dt>
                <dd className="mt-1 font-semibold text-ink">{d.v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Panel>

      {/* ── Reports ── */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <ListOrdered className="h-4 w-4 text-brand" /> Recent reports
            </h2>
            <p className="mt-0.5 text-sm text-mut">Select a row to view the full report.</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadReports} disabled={busy === 'reports'}>
            {busy === 'reports' ? 'Loading…' : 'Reload'}
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
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3 text-right">Score</th>
                  <th className="py-2 pr-3">Band</th>
                  <th className="py-2 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => openDetail(r.id)}
                        className="font-medium text-brand hover:underline"
                      >
                        {r.startup_name || 'Untitled'}
                      </button>
                      <span className="ml-2 font-mono text-[11px] text-mut">{r.app_id ?? ''}</span>
                    </td>
                    <td className="py-2 pr-3 text-mut">
                      {[r.city, r.country].filter(Boolean).join(', ') || '—'}
                    </td>
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
        ) : (
          <p className="mt-4 text-sm text-mut">{busy === 'reports' ? 'Loading…' : '—'}</p>
        )}
      </Panel>

      <div>
        <Button variant="ghost" size="sm" onClick={logout} disabled={busy === 'logout'}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function ReportDetailView({
  report,
  onBack,
  onLogout,
}: {
  report: ReportDetail;
  onBack: () => void;
  onLogout: () => void;
}) {
  const profile = report.profile ?? {};
  const answers = report.answers ?? {};
  const location = [report.city, report.region, report.country].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> All reports
        </Button>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>

      <Panel>
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mut">
          <FileText className="h-3.5 w-3.5" /> Report · {report.id.slice(0, 8)}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {report.startup_name || 'Untitled startup'}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: 'Score', v: `${report.final_score} / 500` },
            { k: 'Band', v: report.band },
            { k: 'App ID', v: report.app_id ?? '—' },
            { k: 'Location', v: location || 'Unknown' },
            { k: 'Created', v: new Date(report.created_at).toLocaleString() },
          ].map((d) => (
            <div key={d.k} className="rounded-lg bg-paper p-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-mut">{d.k}</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink" title={d.v}>{d.v}</p>
            </div>
          ))}
        </div>
        {Object.keys(profile).length > 0 ? (
          <dl className="mt-5 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
            {Object.entries(profile).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 font-mono text-xs text-mut">{k}:</dt>
                <dd className="min-w-0 text-ink">{String(v ?? '—')}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Panel>

      <Panel>
        <h3 className="text-lg font-semibold text-ink">Dimension scores</h3>
        <table className="mt-3 w-full text-left text-sm">
          <tbody className="divide-y divide-line">
            {report.scores.map((s) => (
              <tr key={s.category}>
                <td className="py-2 pr-3 font-medium text-ink">{s.category}</td>
                <td className="py-2 text-right font-mono font-semibold text-ink tabular">{s.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel>
        <h3 className="text-lg font-semibold text-ink">All answers</h3>
        <div className="mt-4 space-y-4">
          {QUESTIONS.map((q) => {
            const value = answers[q.id];
            const label = q.options.find((o) => o.value === value)?.label;
            return (
              <div key={q.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
                  {q.title}
                  <span className="shrink-0 font-mono text-xs text-brand tabular">
                    {value ? `${value}/5` : '—'}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-mut">{label ?? 'Not answered'}</p>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
