'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  CreditCard,
  Database,
  FileText,
  Globe2,
  ListOrdered,
  LogOut,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QUESTIONS } from '@/modules/istartup-score/assessment/bank';
import { Panel } from '@/modules/istartup-score/components/chrome';
import { ONBOARDING_STEPS, type OnboardingAnswers } from '@/modules/istartup-score/onboarding/fields';

import {
  Badge,
  Bars,
  DailyColumns,
  SearchBox,
  Status,
  TableFrame,
  Tile,
  date,
  dateTime,
  go,
  money,
  pct,
  td,
  th,
  useAdminData,
  useHashRoute,
} from './admin-ui';

/**
 * The admin console: everything stored, in five tabs. The route lives in the URL hash
 * (`#founders/<id>`, `#reports/<id>`), so any view can be linked or reloaded.
 */

/* ─────────────────────────────── Types ─────────────────────────────── */

interface Overview {
  config: {
    database: boolean;
    authSecret: boolean;
    stripe: boolean;
    stripeWebhook: boolean;
    appUrl: string | null;
    payments: 'stripe' | 'mock' | 'disabled';
    reportPriceCents: number;
    coursePriceCents: number;
  };
  funnel?: {
    users: number;
    users_7d: number;
    assessed: number;
    reports: number;
    anon_reports: number;
    paid_report: number;
    paid_course: number;
    pending: number;
  };
  revenue?: Array<{ product: string; currency: string; provider: string; count: number; cents: number }>;
  signupsByDay?: Array<{ day: string; count: number }>;
  breakdowns?: Array<{ key: string; label: string; rows: Array<{ label: string; count: number }> }>;
  error?: string;
}

interface Stats {
  total: number;
  avgScore: number;
  byBand: Array<{ label: string; count: number }>;
  byCountry: Array<{ label: string; count: number }>;
  byCity: Array<{ label: string; count: number }>;
  dimAvg: Array<{ label: string; avg: number }>;
  note: string;
}

interface FounderRow {
  id: string;
  email: string;
  full_name: string;
  onboarding: OnboardingAnswers;
  created_at: string;
  last_login_at: string | null;
  report_count: number;
  latest_score: number | null;
  products: string[];
  paid_cents: number;
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
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
}

interface ReportDetail extends ReportSummary {
  profile: Record<string, unknown>;
  company_info: unknown;
  answers: Record<string, number>;
  scores: Array<{ category: string; score: number }>;
}

interface Purchase {
  id: string;
  user_id: string;
  report_id: string | null;
  product: string;
  status: string;
  provider: string;
  provider_ref: string | null;
  amount_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  email?: string;
  full_name?: string;
}

interface DbTest {
  configured: boolean;
  connected?: boolean;
  tableExists?: boolean;
  count?: number;
  error?: string;
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'founders', label: 'Founders', icon: Users },
  { key: 'reports', label: 'Reports', icon: ListOrdered },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'system', label: 'System', icon: Settings2 },
] as const;

const ONBOARDING_LABELS = ONBOARDING_STEPS.flatMap((s) => s.fields.map((f) => ({ key: f.key, label: f.label })));

/** Stored band codes (`strong_foundation`) as readable labels. */
const bandLabel = (code: string) => (code ? code[0].toUpperCase() + code.slice(1).replace(/_/g, ' ') : '—');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const PRODUCT_LABEL: Record<string, string> = { report: 'Full report', course: 'Course + 01 Cert.' };

/* ─────────────────────────────── Shell ─────────────────────────────── */

export function AdminDashboard() {
  const router = useRouter();
  const [tab, id] = useHashRoute();

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Admin sections" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => go(t.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors',
                  active ? 'bg-ink font-medium text-white' : 'text-mut hover:bg-ink/5 hover:text-ink',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </nav>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>

      {tab === 'overview' ? <OverviewTab /> : null}
      {tab === 'founders' ? id ? <FounderDetail id={id} /> : <FoundersTab /> : null}
      {tab === 'reports' ? id ? <ReportDetailView id={id} /> : <ReportsTab /> : null}
      {tab === 'payments' ? <PaymentsTab /> : null}
      {tab === 'system' ? <SystemTab /> : null}
    </div>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  return error ? <p className="rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">{error}</p> : null;
}

function PanelHead({ icon: Icon, title, sub, action }: { icon: typeof Users; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Icon className="h-4 w-4 text-brand" /> {title}
        </h2>
        {sub ? <p className="mt-0.5 text-sm text-mut">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ReloadButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={loading}>
      <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
    </Button>
  );
}

/* ─────────────────────────────── Overview ─────────────────────────────── */

function OverviewTab() {
  const overview = useAdminData<Overview>('/api/admin/overview');
  const stats = useAdminData<Stats>('/api/admin/stats');
  const o = overview.data;
  const f = o?.funnel;

  // Real revenue only — mock (test-mode) purchases are counted separately.
  const revenue = useMemo(() => {
    const real = (o?.revenue ?? []).filter((r) => r.provider !== 'mock');
    const byCurrency = new Map<string, number>();
    for (const r of real) byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + r.cents);
    const mock = (o?.revenue ?? []).filter((r) => r.provider === 'mock').reduce((a, r) => a + r.count, 0);
    return { byCurrency: [...byCurrency.entries()], mock };
  }, [o?.revenue]);

  const reload = () => {
    overview.reload();
    stats.reload();
  };

  return (
    <div className="space-y-5">
      <ErrorNote error={overview.error ?? stats.error} />

      <Panel>
        <PanelHead
          icon={BarChart3}
          title="Overview"
          sub="Founders, conversion and revenue across everything stored."
          action={<ReloadButton onClick={reload} loading={overview.loading || stats.loading} />}
        />
        {f ? (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Tile label="Founders" value={f.users} sub={`+${f.users_7d} this week`} />
            <Tile label="Took assessment" value={f.assessed} sub={`${pct(f.assessed, f.users)} of founders`} />
            <Tile label="Unlocked report" value={f.paid_report} sub={`${pct(f.paid_report, f.assessed)} of assessed`} />
            <Tile label="Course enrolments" value={f.paid_course} sub={`${pct(f.paid_course, f.assessed)} of assessed`} />
            <Tile
              label="Revenue"
              value={revenue.byCurrency.length ? revenue.byCurrency.map(([c, cents]) => money(cents, c)).join(' · ') : money(0)}
              sub={revenue.mock ? `+${revenue.mock} test-mode purchases` : 'Stripe, paid'}
            />
            <Tile label="Avg score" value={stats.data ? `${stats.data.avgScore}` : '—'} sub={`${f.reports} reports / 500`} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-mut">{overview.loading ? 'Loading…' : '—'}</p>
        )}
      </Panel>

      {f ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <h3 className="text-sm font-semibold text-ink">Funnel</h3>
            <p className="mt-0.5 text-xs text-mut">Founders at each step, as a share of sign-ups.</p>
            <Bars
              labelWidth={150}
              max={f.users}
              rows={[
                { label: 'Signed up', count: f.users },
                { label: 'Took assessment', count: f.assessed },
                { label: 'Unlocked report', count: f.paid_report },
                { label: 'Enrolled in course', count: f.paid_course },
              ]}
            />
            {f.pending ? (
              <p className="mt-4 text-xs text-mut">
                {f.pending} checkout{f.pending === 1 ? '' : 's'} started but not paid.
              </p>
            ) : null}
          </Panel>
          <Panel>
            <h3 className="text-sm font-semibold text-ink">Sign-ups per day</h3>
            <div className="mt-3">
              <DailyColumns rows={o?.signupsByDay ?? []} />
            </div>
          </Panel>
        </div>
      ) : null}

      {o?.breakdowns ? (
        <Panel>
          <PanelHead icon={Users} title="Who is signing up" sub="Onboarding answers across all founders." />
          <div className="mt-2 grid gap-x-8 gap-y-6 md:grid-cols-2">
            {o.breakdowns.map((b) => (
              <div key={b.key}>
                <h3 className="text-sm font-semibold text-ink">{b.label}</h3>
                <Bars rows={b.rows} labelWidth={170} />
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {stats.data ? (
        <Panel>
          <PanelHead icon={FileText} title="Assessment results" sub={`${plural(stats.data.total, 'report')}.`} />
          <div className="mt-2 grid gap-x-8 gap-y-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">By readiness band</h3>
              <Bars rows={stats.data.byBand.map((b) => ({ ...b, label: bandLabel(b.label) }))} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Avg dimension score</h3>
              <Bars rows={stats.data.dimAvg.map((d) => ({ label: d.label, count: d.avg }))} max={100} format={(n) => `${n}%`} />
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Globe2 className="h-3.5 w-3.5 text-mut" /> By country (IP)
              </h3>
              <Bars rows={stats.data.byCountry} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Top cities (IP)</h3>
              <Bars rows={stats.data.byCity.slice(0, 8)} />
            </div>
          </div>
          <p className="mt-5 text-xs text-mut">{stats.data.note}</p>
        </Panel>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────── Founders ─────────────────────────────── */

function FoundersTab() {
  const { data, error, loading, reload } = useAdminData<{ users: FounderRow[] }>('/api/admin/users');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = data?.users ?? [];
    if (!needle) return all;
    return all.filter((u) =>
      [u.email, u.full_name, ...Object.values(u.onboarding ?? {})].some((v) => String(v ?? '').toLowerCase().includes(needle)),
    );
  }, [data, q]);

  return (
    <Panel>
      <PanelHead
        icon={Users}
        title="Founders"
        sub={data ? `${plural(data.users.length, 'account')}. Select one for everything they submitted.` : undefined}
        action={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <SearchBox value={q} onChange={setQ} placeholder="Search name, email, startup, sector…" />
            <ReloadButton onClick={reload} loading={loading} />
          </div>
        }
      />
      <ErrorNote error={error} />
      {data ? (
        rows.length === 0 ? (
          <p className="mt-4 text-sm text-mut">{q ? 'No founders match.' : 'No founders yet.'}</p>
        ) : (
          <TableFrame>
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Founder</th>
                  <th className={th}>Startup</th>
                  <th className={th}>Stage</th>
                  <th className={th}>Founders</th>
                  <th className={th}>Founded</th>
                  <th className={cn(th, 'text-right')}>Reports</th>
                  <th className={cn(th, 'text-right')}>Score</th>
                  <th className={th}>Paid</th>
                  <th className={cn(th, 'pr-0 text-right')}>Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((u) => (
                  <tr key={u.id} className="cursor-pointer hover:bg-paper" onClick={() => go(`founders/${u.id}`)}>
                    <td className={td}>
                      <button type="button" className="text-left font-medium text-brand hover:underline" onClick={() => go(`founders/${u.id}`)}>
                        {u.full_name || '—'}
                      </button>
                      <span className="block text-xs text-mut">{u.email}</span>
                    </td>
                    <td className={td}>
                      <span className="text-ink">{u.onboarding?.startupName || '—'}</span>
                      <span className="block text-xs text-mut">{u.onboarding?.sector ?? ''}</span>
                    </td>
                    <td className={cn(td, 'text-mut')}>{u.onboarding?.stage ?? '—'}</td>
                    <td className={cn(td, 'text-mut')}>{u.onboarding?.founders ?? '—'}</td>
                    <td className={cn(td, 'text-mut')}>{u.onboarding?.foundedYear ?? '—'}</td>
                    <td className={cn(td, 'text-right font-mono tabular')}>{u.report_count}</td>
                    <td className={cn(td, 'text-right font-mono font-semibold tabular')}>{u.latest_score ?? '—'}</td>
                    <td className={td}>
                      <span className="flex flex-wrap gap-1">
                        {u.products.length === 0 ? <span className="text-mut">—</span> : null}
                        {u.products.map((p) => (
                          <Badge key={p} tone={p === 'course' ? 'brand' : 'good'}>
                            {PRODUCT_LABEL[p] ?? p}
                          </Badge>
                        ))}
                      </span>
                    </td>
                    <td className={cn(td, 'pr-0 text-right font-mono text-xs text-mut')}>{date(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        )
      ) : (
        <p className="mt-4 text-sm text-mut">{loading ? 'Loading…' : '—'}</p>
      )}
    </Panel>
  );
}

function FounderDetail({ id }: { id: string }) {
  const { data, error, loading } = useAdminData<{
    user: Omit<FounderRow, 'report_count' | 'latest_score' | 'products' | 'paid_cents'>;
    reports: ReportSummary[];
    purchases: Purchase[];
  }>(`/api/admin/users/${id}`);

  const back = (
    <Button variant="ghost" size="sm" onClick={() => go('founders')}>
      <ArrowLeft className="h-3.5 w-3.5" /> All founders
    </Button>
  );
  if (error) return <div className="space-y-4">{back}<ErrorNote error={error} /></div>;
  if (!data) return <div className="space-y-4">{back}<p className="text-sm text-mut">{loading ? 'Loading…' : '—'}</p></div>;

  const { user, reports, purchases } = data;
  const paid = purchases.filter((p) => p.status === 'paid');
  const known = new Set<string>(ONBOARDING_LABELS.map((l) => l.key));
  const extra = Object.entries(user.onboarding ?? {}).filter(([k]) => !known.has(k));

  return (
    <div className="space-y-5">
      {back}
      <Panel>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mut">Founder · {user.id.slice(0, 8)}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{user.full_name || user.email}</h2>
        <p className="mt-0.5 text-sm text-mut">
          <a href={`mailto:${user.email}`} className="text-brand hover:underline">{user.email}</a>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Joined" value={date(user.created_at)} sub={dateTime(user.created_at)} />
          <Tile label="Last sign-in" value={date(user.last_login_at)} sub={dateTime(user.last_login_at)} />
          <Tile label="Reports" value={reports.length} sub={reports[0] ? `Latest ${reports[0].final_score} / 500` : 'None yet'} />
          <Tile
            label="Paid"
            value={money(paid.reduce((a, p) => a + p.amount_cents, 0), paid[0]?.currency)}
            sub={paid.map((p) => PRODUCT_LABEL[p.product] ?? p.product).join(', ') || 'Nothing yet'}
          />
        </div>
      </Panel>

      <Panel>
        <h3 className="text-lg font-semibold text-ink">Onboarding answers</h3>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {ONBOARDING_LABELS.map(({ key, label }) => (
            <div key={key} className={cn('border-b border-line pb-2.5', key === 'pitch' && 'sm:col-span-2')}>
              <dt className="text-xs text-mut">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-line text-sm text-ink">{user.onboarding?.[key] || '—'}</dd>
            </div>
          ))}
          {extra.map(([k, v]) => (
            <div key={k} className="border-b border-line pb-2.5">
              <dt className="font-mono text-xs text-mut">{k}</dt>
              <dd className="mt-0.5 text-sm text-ink">{String(v ?? '—')}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel>
        <h3 className="text-lg font-semibold text-ink">Reports</h3>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-mut">No assessment submitted yet.</p>
        ) : (
          <ReportsTable rows={reports} showFounder={false} />
        )}
      </Panel>

      <Panel>
        <h3 className="text-lg font-semibold text-ink">Purchases</h3>
        {purchases.length === 0 ? (
          <p className="mt-3 text-sm text-mut">No checkouts.</p>
        ) : (
          <PurchasesTable rows={purchases} showFounder={false} />
        )}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────── Reports ─────────────────────────────── */

function ReportsTab() {
  const { data, error, loading, reload } = useAdminData<{ reports: ReportSummary[] }>('/api/reports?limit=1000');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = data?.reports ?? [];
    if (!needle) return all;
    return all.filter((r) =>
      [r.startup_name, r.user_email, r.user_name, r.band, r.city, r.country, r.app_id].some((v) =>
        String(v ?? '').toLowerCase().includes(needle),
      ),
    );
  }, [data, q]);

  return (
    <Panel>
      <PanelHead
        icon={ListOrdered}
        title="Reports"
        sub={data ? `${plural(data.reports.length, 'report')}. Select one for every answer.` : undefined}
        action={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <SearchBox value={q} onChange={setQ} placeholder="Search startup, founder, band…" />
            <ReloadButton onClick={reload} loading={loading} />
          </div>
        }
      />
      <ErrorNote error={error} />
      {data ? (
        rows.length === 0 ? (
          <p className="mt-4 text-sm text-mut">{q ? 'No reports match.' : 'No reports stored yet.'}</p>
        ) : (
          <ReportsTable rows={rows} showFounder />
        )
      ) : (
        <p className="mt-4 text-sm text-mut">{loading ? 'Loading…' : '—'}</p>
      )}
    </Panel>
  );
}

function ReportsTable({ rows, showFounder }: { rows: ReportSummary[]; showFounder: boolean }) {
  return (
    <TableFrame>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className={th}>Startup</th>
            {showFounder ? <th className={th}>Founder</th> : null}
            <th className={th}>Location</th>
            <th className={cn(th, 'text-right')}>Score</th>
            <th className={th}>Band</th>
            <th className={cn(th, 'pr-0 text-right')}>Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="cursor-pointer hover:bg-paper" onClick={() => go(`reports/${r.id}`)}>
              <td className={td}>
                <button type="button" className="text-left font-medium text-brand hover:underline" onClick={() => go(`reports/${r.id}`)}>
                  {r.startup_name || 'Untitled'}
                </button>
                {r.app_id ? <span className="ml-2 font-mono text-[11px] text-mut">{r.app_id}</span> : null}
              </td>
              {showFounder ? (
                <td className={cn(td, 'text-mut')}>
                  {r.user_id ? (
                    <button
                      type="button"
                      className="text-left hover:text-brand hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        go(`founders/${r.user_id}`);
                      }}
                    >
                      {r.user_name || r.user_email}
                    </button>
                  ) : (
                    <span className="text-xs">Anonymous</span>
                  )}
                </td>
              ) : null}
              <td className={cn(td, 'text-mut')}>{[r.city, r.country].filter(Boolean).join(', ') || '—'}</td>
              <td className={cn(td, 'text-right font-mono font-semibold text-ink tabular')}>{r.final_score}</td>
              <td className={cn(td, 'text-mut')}>{bandLabel(r.band)}</td>
              <td className={cn(td, 'pr-0 text-right font-mono text-xs text-mut')}>{dateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
}

function ReportDetailView({ id }: { id: string }) {
  const { data, error, loading } = useAdminData<{ report: ReportDetail }>(`/api/reports/${id}`);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const back = (
    <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </Button>
  );
  if (error) return <div className="space-y-4">{back}<ErrorNote error={error} /></div>;
  if (!data) return <div className="space-y-4">{back}<p className="text-sm text-mut">{loading ? 'Loading…' : '—'}</p></div>;

  const report = data.report;
  const answers = report.answers ?? {};
  const location = [report.city, report.region, report.country].filter(Boolean).join(', ');
  // The onboarding copy saved with the report is shown on the founder page instead.
  const profile = Object.entries(report.profile ?? {}).filter(([k, v]) => k !== 'onboarding' && typeof v !== 'object');

  const remove = async () => {
    if (!window.confirm(`Delete the report for “${report.startup_name || 'Untitled'}”? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/reports/${report.id}`, { method: 'DELETE' });
    if (res.ok) go('reports');
    else {
      setDeleteError((await res.json().catch(() => ({}))).error ?? 'Delete failed.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        <Button variant="ghost" size="sm" onClick={remove} disabled={deleting} className="text-risk hover:bg-risk-soft hover:text-risk">
          <Trash2 className="h-3.5 w-3.5" /> Delete report
        </Button>
      </div>
      <ErrorNote error={deleteError} />

      <Panel>
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mut">
          <FileText className="h-3.5 w-3.5" /> Report · {report.id.slice(0, 8)}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{report.startup_name || 'Untitled startup'}</h2>
        {report.user_id ? (
          <button type="button" onClick={() => go(`founders/${report.user_id}`)} className="mt-1 text-sm text-brand hover:underline">
            View founder →
          </button>
        ) : (
          <p className="mt-1 text-sm text-mut">Submitted before accounts existed (anonymous).</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile label="Score" value={`${report.final_score} / 500`} />
          <Tile label="Band" value={bandLabel(report.band)} />
          <Tile label="App ID" value={report.app_id ?? '—'} />
          <Tile label="Location" value={location || 'Unknown'} />
          <Tile label="Created" value={date(report.created_at)} sub={dateTime(report.created_at)} />
        </div>
        {profile.length > 0 ? (
          <dl className="mt-5 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
            {profile.map(([k, v]) => (
              <div key={k} className={cn('flex gap-2', k === 'description' && 'sm:col-span-2')}>
                <dt className="shrink-0 font-mono text-xs text-mut">{k}:</dt>
                <dd className="min-w-0 text-ink">{String(v ?? '—')}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Panel>

      <Panel>
        <h3 className="text-lg font-semibold text-ink">Dimension scores</h3>
        <Bars rows={report.scores.map((s) => ({ label: s.category, count: s.score }))} max={100} format={(n) => `${n}%`} />
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
                  <span className="shrink-0 font-mono text-xs text-ink tabular">{value ? `${value}/5` : '—'}</span>
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

/* ─────────────────────────────── Payments ─────────────────────────────── */

function PaymentsTab() {
  const { data, error, loading, reload } = useAdminData<{ purchases: Purchase[] }>('/api/admin/purchases');
  const rows = data?.purchases ?? [];
  const sum = (filter: (p: Purchase) => boolean) =>
    rows.filter((p) => p.status === 'paid' && p.provider !== 'mock' && filter(p)).reduce((a, p) => a + p.amount_cents, 0);
  const currency = rows[0]?.currency;

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHead
          icon={CreditCard}
          title="Payments"
          sub="Every checkout. Test-mode purchases are marked and left out of revenue."
          action={<ReloadButton onClick={reload} loading={loading} />}
        />
        <ErrorNote error={error} />
        {data ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Revenue" value={money(sum(() => true), currency)} />
            <Tile label="Full reports" value={money(sum((p) => p.product === 'report'), currency)} sub={`${rows.filter((p) => p.status === 'paid' && p.product === 'report').length} paid`} />
            <Tile label="Courses" value={money(sum((p) => p.product === 'course'), currency)} sub={`${rows.filter((p) => p.status === 'paid' && p.product === 'course').length} paid`} />
            <Tile label="Unpaid checkouts" value={rows.filter((p) => p.status !== 'paid').length} sub="Started, not completed" />
          </div>
        ) : null}
      </Panel>
      {data ? (
        <Panel>
          {rows.length === 0 ? <p className="text-sm text-mut">No checkouts yet.</p> : <PurchasesTable rows={rows} showFounder />}
        </Panel>
      ) : null}
    </div>
  );
}

function PurchasesTable({ rows, showFounder }: { rows: Purchase[]; showFounder: boolean }) {
  return (
    <TableFrame>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className={th}>Date</th>
            {showFounder ? <th className={th}>Founder</th> : null}
            <th className={th}>Product</th>
            <th className={cn(th, 'text-right')}>Amount</th>
            <th className={th}>Status</th>
            <th className={cn(th, 'pr-0')}>Provider</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => (
            <tr key={p.id}>
              <td className={cn(td, 'font-mono text-xs text-mut')}>{dateTime(p.paid_at ?? p.created_at)}</td>
              {showFounder ? (
                <td className={td}>
                  <button type="button" className="text-left text-brand hover:underline" onClick={() => go(`founders/${p.user_id}`)}>
                    {p.full_name || p.email}
                  </button>
                  <span className="block text-xs text-mut">{p.email}</span>
                </td>
              ) : null}
              <td className={cn(td, 'text-ink')}>{PRODUCT_LABEL[p.product] ?? p.product}</td>
              <td className={cn(td, 'text-right font-mono font-semibold text-ink tabular')}>{money(p.amount_cents, p.currency)}</td>
              <td className={td}>
                <Badge tone={p.status === 'paid' ? 'good' : 'warn'}>{p.status === 'paid' ? 'Paid' : 'Pending'}</Badge>
              </td>
              <td className={cn(td, 'pr-0 text-mut')}>
                {p.provider === 'mock' ? <Badge>Test mode</Badge> : 'Stripe'}
                {p.provider_ref ? <span className="block max-w-[180px] truncate font-mono text-[11px]" title={p.provider_ref}>{p.provider_ref}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
}

/* ─────────────────────────────── System ─────────────────────────────── */

function SystemTab() {
  const overview = useAdminData<Overview>('/api/admin/overview');
  const db = useAdminData<DbTest>('/api/admin/db-test');
  const c = overview.data?.config;

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHead
          icon={Database}
          title="Database"
          sub="POSTGRES_URL connectivity and the istartup_reports table."
          action={<ReloadButton onClick={db.reload} loading={db.loading} />}
        />
        <ErrorNote error={db.error} />
        {db.data ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Configured" value={String(db.data.configured)} />
            <Tile label="Connected" value={String(db.data.connected ?? '—')} />
            <Tile label="Reports table" value={String(db.data.tableExists ?? '—')} />
            <Tile label="Report rows" value={String(db.data.count ?? '—')} />
          </div>
        ) : null}
      </Panel>

      <Panel>
        <PanelHead icon={Settings2} title="Configuration" sub="Which environment variables are set (values are never shown)." />
        <ErrorNote error={overview.error && !c ? overview.error : null} />
        {c ? (
          <ul className="mt-4 divide-y divide-line">
            {[
              { ok: c.authSecret, name: 'AUTH_SECRET', note: c.authSecret ? 'Founder sessions use their own key.' : 'Not set: sessions fall back to the admin password. Set a random value.' },
              {
                ok: c.payments === 'stripe',
                name: 'Payments mode',
                note:
                  c.payments === 'stripe'
                    ? 'Live: Stripe Checkout.'
                    : c.payments === 'mock'
                      ? 'Test mode: purchases complete instantly, nothing is charged.'
                      : 'Disabled: set STRIPE_SECRET_KEY (or PAYMENTS_MODE=mock to demo).',
              },
              { ok: c.stripeWebhook, name: 'STRIPE_WEBHOOK_SECRET', note: c.stripeWebhook ? 'Webhook verified at /api/webhooks/stripe.' : 'Not set: payments only confirm when founders return from checkout.' },
              { ok: Boolean(c.appUrl), name: 'APP_URL', note: c.appUrl ?? 'Optional: checkout returns to the request origin.' },
              { ok: true, name: 'Prices', note: `Full report ${money(c.reportPriceCents)} · Course ${money(c.coursePriceCents)}` },
            ].map((row) => (
              <li key={row.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <Status ok={row.ok}>
                  <span className="font-mono text-ink">{row.name}</span>
                </Status>
                <span className="text-sm text-mut sm:text-right">{row.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-mut">{overview.loading ? 'Loading…' : '—'}</p>
        )}
      </Panel>
    </div>
  );
}
