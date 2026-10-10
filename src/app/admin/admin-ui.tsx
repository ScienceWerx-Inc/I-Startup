'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Small building blocks shared by the admin console views. */

/** Fetches an admin JSON endpoint; `reload` refetches. Errors surface as a message. */
export function useAdminData<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data: T | null; error: string | null }>({
    url: null,
    data: null,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status}).`);
        return body as T;
      })
      .then(
        (data) => alive && setState({ url, data, error: null }),
        (e: unknown) => alive && setState({ url, data: null, error: e instanceof Error ? e.message : 'Request failed.' }),
      );
    return () => {
      alive = false;
    };
  }, [url, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const fresh = state.url === url;
  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: Boolean(url) && !fresh,
    reload,
  };
}

/** The URL hash as the console's route: `#founders/<id>` → ['founders', '<id>']. */
export function useHashRoute(): [string, string | undefined] {
  const hash = useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb);
      return () => window.removeEventListener('hashchange', cb);
    },
    () => window.location.hash,
    () => '',
  );
  const [tab, id] = hash.replace(/^#/, '').split('/');
  return [tab || 'overview', id];
}

export const go = (route: string) => {
  window.location.hash = route;
  window.scrollTo({ top: 0 });
};

export function money(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export const dateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');
export const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '—');
export const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '—');

export function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-paper p-3.5">
      <p className="truncate font-mono text-[11px] uppercase tracking-wider text-mut">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold text-ink tabular">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-xs text-mut">{sub}</p> : null}
    </div>
  );
}

/** Single-series horizontal bars: label · bar · value. Values are text, not the bar color. */
export function Bars({
  rows,
  max,
  format = (n) => String(n),
  labelWidth = 140,
}: {
  rows: Array<{ label: string; count: number }>;
  max?: number;
  format?: (n: number) => string;
  labelWidth?: number;
}) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-mut">No data yet.</p>;
  const top = max ?? Math.max(0, ...rows.map((r) => r.count));
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li
          key={r.label}
          className="grid items-center gap-3 text-sm"
          style={{ gridTemplateColumns: `${labelWidth}px 1fr 52px` }}
          title={`${r.label}: ${format(r.count)}`}
        >
          <span className="truncate text-ink">{r.label || 'Unknown'}</span>
          <span className="h-2 rounded-[4px] bg-line">
            <span
              className="block h-full rounded-[4px] bg-brand"
              style={{ width: `${top > 0 ? (r.count / top) * 100 : 0}%` }}
            />
          </span>
          <span className="text-right font-mono text-xs font-semibold text-ink tabular">{format(r.count)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Daily counts over the last `days` days as columns, zero-filled, with a hover readout. */
export function DailyColumns({ rows, days = 30 }: { rows: Array<{ day: string; count: number }>; days?: number }) {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    const day = d.toISOString().slice(0, 10);
    return { day, count: byDay.get(day) ?? 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.count));
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover !== null ? series[hover] : null;

  return (
    <div>
      <p className="h-5 font-mono text-xs text-mut">
        {shown ? (
          <>
            <span className="text-ink">{shown.count}</span> on {shown.day}
          </>
        ) : (
          `${series.reduce((a, s) => a + s.count, 0)} in the last ${days} days`
        )}
      </p>
      <div className="mt-2 flex h-28 items-end gap-[2px] border-b border-line" onMouseLeave={() => setHover(null)}>
        {series.map((s, i) => (
          <div
            key={s.day}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
            aria-label={`${s.day}: ${s.count}`}
          >
            <div
              className={cn('w-full rounded-t-[4px]', hover === i ? 'bg-ink' : 'bg-brand')}
              style={{ height: s.count ? `${Math.max(4, (s.count / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-mut">
        <span>{series[0].day}</span>
        <span>{series[series.length - 1].day}</span>
      </div>
    </div>
  );
}

export function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', ok ? 'text-good' : 'text-warn')}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {children}
    </span>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'good' | 'warn' | 'brand' | 'neutral'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        tone === 'good' && 'bg-good-soft text-good',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'brand' && 'bg-brand-soft text-brand',
        tone === 'neutral' && 'bg-paper text-mut',
      )}
    >
      {children}
    </span>
  );
}

/** A scrollable table frame so wide tables never push the page sideways on phones. */
export function TableFrame({ children }: { children: ReactNode }) {
  return <div className="-mx-5 mt-4 overflow-x-auto px-5 sm:-mx-7 sm:px-7">{children}</div>;
}

export const th = 'whitespace-nowrap py-2 pr-4 font-mono text-[11px] font-medium uppercase tracking-wider text-mut';
export const td = 'py-2.5 pr-4 align-top';

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-mut/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:w-72"
    />
  );
}
