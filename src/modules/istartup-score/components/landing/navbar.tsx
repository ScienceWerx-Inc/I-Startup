'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { Wordmark } from '../chrome';
import { NAV_LINKS } from './data';
import { btnArrow, btnPrimary, container } from './ui';

/**
 * Floating nav: transparent at the top, a frosted glass bar once the page scrolls.
 * Collapses to a hamburger menu below `lg`.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const glass = scrolled || open;

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-3">
      <div className={container}>
        <div
          className={cn(
            'rounded-panel border transition-[background-color,border-color,box-shadow] duration-300',
            glass ? 'border-edge bg-surface/75 shadow-raised backdrop-blur-xl' : 'border-transparent',
          )}
        >
          <nav aria-label="Main" className="flex h-14 items-center justify-between gap-4 pl-4 pr-2 sm:pl-5">
            <Link href="/" aria-label="iSTARTUP Score home" className="rounded-md">
              <Wordmark />
            </Link>

            <ul className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <Link href="/interview" className={cn(btnPrimary('sm'), 'hidden sm:inline-flex')}>
                Start assessment <ArrowRight className={btnArrow} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label={open ? 'Close menu' : 'Open menu'}
                className="flex h-10 w-10 items-center justify-center rounded-tile text-fg transition-colors hover:bg-surface-2 lg:hidden"
              >
                {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
              </button>
            </div>
          </nav>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id={menuId}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="border-t border-edge px-3 pb-4 pt-2 lg:hidden"
              >
                <ul className="grid gap-1">
                  {NAV_LINKS.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-3 text-[15px] font-medium text-fg transition-colors hover:bg-surface-2"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <Link href="/interview" className={cn(btnPrimary('lg'), 'mt-3 w-full')}>
                  Start assessment <ArrowRight className={btnArrow} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
