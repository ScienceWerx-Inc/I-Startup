'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Draws a "creative" diagram's Mermaid source as inline SVG.
 *
 * `mermaid` is loaded dynamically and only in the browser — it touches the DOM
 * directly (it is not a pure string-in/string-out renderer), which is also why
 * this can't be a server component. Each instance gets its own Mermaid render
 * call with a unique id; nothing here shares Mermaid's global state across
 * concurrent diagrams on one page.
 *
 * A diagram that fails to render shows the error AND the raw source, never a
 * silent blank — the model can write invalid Mermaid, and "regenerate" only
 * makes sense if the person can see what went wrong.
 */

interface MermaidViewProps {
  source: string;
  title?: string;
  className?: string;
  /** Hides the raw-source toggle chrome — used for small card previews. */
  compact?: boolean;
  /**
   * Render nothing when the source won't draw. For learners, who can't
   * regenerate it and are better served by the text alone than by an error.
   */
  hideOnError?: boolean;
}

/** One counter shared by every instance, so ids never collide even when several diagrams mount in the same tick. */
let instanceCounter = 0;

export function MermaidView({
  source,
  title,
  className,
  compact = false,
  hideOnError = false,
}: MermaidViewProps) {
  const reactId = useId().replace(/:/g, '');
  const instanceId = useMemo(() => `mermaid-${reactId}-${instanceCounter++}`, [reactId]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Keyed by the source it was drawn from, so a new source reads as "drawing" without
  // resetting state inside the effect.
  const [drawn, setDrawn] = useState<{ source: string; svg?: string; error?: string } | null>(null);
  const current = drawn?.source === source ? drawn : null;
  const svg = current?.svg ?? null;
  const error = current?.error ?? null;
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
          fontFamily: 'inherit',
        });
        // `mermaid.parse` first, so a syntax error surfaces as this diagram's
        // own error state rather than throwing across the whole render pass.
        await mermaid.parse(source);
        const { svg: rendered } = await mermaid.render(instanceId, source);
        if (!cancelled) setDrawn({ source, svg: rendered });
      } catch (err) {
        if (!cancelled) {
          setDrawn({ source, error: err instanceof Error ? err.message : 'That diagram could not be drawn.' });
        }
      }
    })();

    // Mermaid renders into a hidden temporary element when no container is
    // given, and removes that element itself once rendering completes — so
    // there is nothing of its own for this effect to clean up.
    return () => {
      cancelled = true;
    };
  }, [source, instanceId]);

  if (error && hideOnError) return null;

  if (error) {
    return (
      <div className={cn('space-y-2 rounded-lg border border-line border-dashed p-4', className)}>
        <p className="text-sm font-medium text-destructive">Couldn&apos;t draw this diagram</p>
        <p className="text-xs text-mut">{error}</p>
        <details className="text-xs">
          <summary className="cursor-pointer text-mut hover:text-ink">
            Show the Mermaid source
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-mist/60 p-2 font-mono text-[11px] leading-relaxed">
            {source}
          </pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-line border-dashed p-8 text-sm text-mut',
          className,
        )}
      >
        Drawing…
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-line bg-surface', className)}>
      <div
        ref={containerRef}
        role="img"
        aria-label={title ?? 'Diagram'}
        className={cn(
          'w-full overflow-auto p-3 [&_svg]:mx-auto [&_svg]:h-auto',
          compact ? 'max-h-56' : 'max-h-[70vh]',
        )}
        // Trusted content: `svg` came from mermaid.render() over source this
        // component generated the render for — never from a raw user string
        // dropped into innerHTML directly.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {!compact && (
        <div className="border-t border-line px-3 py-1.5">
          <button
            type="button"
            className="text-xs text-mut hover:text-ink"
            onClick={() => setShowSource((v) => !v)}
          >
            {showSource ? 'Hide' : 'Show'} Mermaid source
          </button>
          {showSource && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-mist/60 p-2 font-mono text-[11px] leading-relaxed">
              {source}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
