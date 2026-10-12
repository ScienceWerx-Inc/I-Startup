'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { useAccount } from '@/hooks/use-account';
import { cn } from '@/lib/utils';
import { Wordmark } from '../../chrome';
import { ASSESSMENT_HREF, MY_ASSESSMENT_HREF, SIGN_IN_HREF, useTiming, wrap } from './primitives';

export const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Funders', href: '#funders' },
] as const;

/**
 * The site navigation. On the landing page the links scroll to its sections; on other
 * pages (`variant="page"`, the assessment) they lead back into the landing, the
 * "Get started" button is dropped, and the page can put its own status in `right`.
 *
 * Account-aware, like the rest of the app: signed out, "Sign In" and "Get Started" (the
 * onboarding, where accounts are created); signed in, "My Assessment" and "Sign Out".
 */
export function SiteNav({ variant = 'landing', right }: { variant?: 'landing' | 'page'; right?: ReactNode }) {
  const onLanding = variant === 'landing';
  const { user, isLoading, signOut } = useAccount();
  const firstName = user ? user.fullName.split(' ')[0] || user.email : '';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const t = useTiming();

  const hrefFor = (href: string) => (onLanding ? href : `/${href}`);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  // While the menu is open: Escape closes it and hands focus back to the toggle, and a
  // resize past the mobile breakpoint closes it.
  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, [open]);

  return (
    <header
      className={cn(
        'theme-bi no-print sticky top-0 z-50 border-b transition-[border-color,box-shadow,background-color] duration-300',
        scrolled || open
          ? 'border-line bg-paper/90 shadow-[0_1px_12px_-6px_rgba(11,23,48,0.12)] backdrop-blur-md'
          : 'border-transparent bg-paper',
      )}
    >
      <div className={cn(wrap, 'flex h-16 items-center justify-between gap-6')}>
        <Link href="/" aria-label="iStartup Score home" className="rounded-md text-ink">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={hrefFor(l.href)}
                  className="rounded-md px-3 py-2 text-[14px] font-medium text-mut transition-colors duration-200 hover:text-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {right}
          {isLoading ? (
            <span aria-hidden className="hidden h-10 w-44 sm:block" />
          ) : user ? (
            <>
              {onLanding && (
                <Link href={MY_ASSESSMENT_HREF} className="hidden h-10 items-center bi-btn-primary rounded-btn px-4 text-[14px] font-semibold sm:inline-flex">
                  My Assessment
                </Link>
              )}
              <span className="hidden max-w-[140px] truncate text-[14px] text-ink sm:block" title={user.email}>
                {firstName}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="hidden rounded-md px-3 py-2 text-[14px] font-medium text-mut transition-colors duration-200 hover:text-ink sm:block"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href={SIGN_IN_HREF}
                className="hidden rounded-md px-3 py-2 text-[14px] font-medium text-ink transition-colors duration-200 hover:text-funder sm:block"
              >
                Sign In
              </Link>
              {onLanding && (
                <Link href={ASSESSMENT_HREF} className="hidden h-10 items-center bi-btn-primary rounded-btn px-4 text-[14px] font-semibold sm:inline-flex">
                  Get Started
                </Link>
              )}
            </>
          )}
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink transition-colors hover:bg-mist lg:hidden"
          >
            {open ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="site-menu"
            aria-label="Main"
            className="absolute inset-x-0 top-full overflow-hidden border-y border-line bg-paper shadow-float lg:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={t(0, 0.25)}
          >
            <ul className={cn(wrap, 'grid gap-1 py-3')}>
              {NAV_LINKS.map((l, i) => (
                <li key={l.href}>
                  <a
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={hrefFor(l.href)}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center rounded-btn px-3 text-[16px] font-medium text-ink transition-colors hover:bg-mist"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              {!isLoading && (
                <li className={cn('mt-2 grid gap-3 border-t border-line pt-4', onLanding && 'grid-cols-2')}>
                  {user ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          signOut();
                        }}
                        className="flex h-12 items-center justify-center rounded-btn border border-line-strong text-[15px] font-semibold text-ink"
                      >
                        Sign Out
                      </button>
                      {onLanding && (
                        <Link href={MY_ASSESSMENT_HREF} className="flex h-12 items-center justify-center bi-btn-primary rounded-btn text-[15px] font-semibold">
                          My Assessment
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link href={SIGN_IN_HREF} className="flex h-12 items-center justify-center rounded-btn border border-line-strong text-[15px] font-semibold text-ink">
                        Sign In
                      </Link>
                      {onLanding && (
                        <Link href={ASSESSMENT_HREF} className="flex h-12 items-center justify-center bi-btn-primary rounded-btn text-[15px] font-semibold">
                          Get Started
                        </Link>
                      )}
                    </>
                  )}
                </li>
              )}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
