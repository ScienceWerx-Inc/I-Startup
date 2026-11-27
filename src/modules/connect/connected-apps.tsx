'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Link2 } from 'lucide-react';

import type { PeersResponse } from '@/lib/connect/types';
import { Eyebrow, Panel } from '@/modules/istartup-score/components/chrome';

const STATUS_STYLE = {
  VALID: 'bg-good-soft text-good',
  EXPIRED: 'bg-mist text-mut',
  REVOKED: 'bg-risk-soft text-risk',
} as const;

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null;

/**
 * "Connected apps": what the founder's other ScienceWerx apps (FounderFit, PrismScore)
 * know about them, fetched after the page renders so a slow peer never holds it up.
 * Hidden entirely when there is nothing to show; a prompt to verify when the founder's
 * email isn't confirmed yet (peers are matched by verified email only).
 */
export function ConnectedApps() {
  const [data, setData] = useState<PeersResponse | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/connect/peers', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<PeersResponse>) : null))
      .catch(() => null)
      .then((body) => {
        if (alive) setData(body);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  if (data.needsVerification) {
    return (
      <Panel className="mt-6 flex items-start gap-3">
        <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-sm text-ink">
          <span className="font-semibold">Connected apps.</span>{' '}
          <span className="text-mut">
            Verify your email (see the link we sent you) to see your FounderFit results and PrismScore
            certificates here.
          </span>
        </p>
      </Panel>
    );
  }

  if (!data.cards.length && !data.certificates.length) return null;

  return (
    <section className="mt-8" aria-labelledby="connected-apps">
      <Eyebrow>Connected apps</Eyebrow>
      <h2 id="connected-apps" className="mt-2 text-xl font-semibold tracking-tight text-ink">
        Your results across ScienceWerx
      </h2>

      {data.cards.length ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {data.cards.map((card) => (
            <li key={`${card.app}-${card.title}`}>
              <Panel className="flex h-full flex-col">
                <p className="text-xs text-mut">{card.title}</p>
                <p className="mt-1 text-lg font-semibold text-ink">{card.headline}</p>
                {card.lines.length ? (
                  <dl className="mt-3 grid gap-1 text-sm">
                    {card.lines.map((line) => (
                      <div key={line.label} className="flex gap-2">
                        <dt className="shrink-0 text-mut">{line.label}:</dt>
                        <dd className="min-w-0 text-ink">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand"
                >
                  Open in {card.appName} <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Panel>
            </li>
          ))}
        </ul>
      ) : null}

      {data.certificates.length ? (
        <Panel className="mt-4">
          <p className="text-sm font-semibold text-ink">Your certificates</p>
          <ul className="mt-3 divide-y divide-line">
            {data.certificates.map((c) => (
              <li key={`${c.app}-${c.code}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{c.title}</p>
                  <p className="text-xs text-mut">
                    {c.issuer} · {c.code}
                    {day(c.issuedAt) ? ` · issued ${day(c.issuedAt)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                    {c.status.toLowerCase()}
                  </span>
                  <a
                    href={c.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand"
                  >
                    Verify <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </section>
  );
}
