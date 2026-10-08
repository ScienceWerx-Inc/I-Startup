'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';
import { Wordmark } from '../chrome';
import { container } from './ui';

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Framework', href: '#framework' },
  { label: 'Resources', href: '#resources' },
  { label: 'Pricing', href: '#pricing' },
];

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

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-[76px] transition-colors duration-300 flex items-center',
        (scrolled || open) ? 'bg-[#F5F7F8]/90 backdrop-blur border-b border-[#D9E0E5]' : 'bg-transparent'
      )}
    >
      <div className={cn(container, 'w-full')}>
        <nav aria-label="Main" className="flex items-center justify-between w-full">
          {/* LEFT: Logo */}
          <Link href="/" aria-label="iSTARTUP Score home" className="text-[#071B38]">
            <Wordmark />
          </Link>

          {/* CENTER: Links */}
          <ul className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-[14px] font-semibold text-[#657184] transition-colors hover:text-[#071B38]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-6">
            <Link href="/login" className="hidden lg:block text-[14px] font-semibold text-[#657184] hover:text-[#071B38] transition-colors">
              Log in
            </Link>
            <Link
              href="/interview"
              className="hidden sm:inline-flex h-[38px] items-center justify-center gap-2 rounded-[8px] bg-[#071B38] px-5 text-[13px] font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Get your assessment <ArrowRight className="h-4 w-4" />
            </Link>
            
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 items-center justify-center text-[#071B38] lg:hidden"
            >
              {open ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={menuId}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="absolute left-0 right-0 top-[76px] bg-[#F5F7F8] border-b border-[#D9E0E5] px-4 py-4 lg:hidden shadow-sm"
            >
              <ul className="grid gap-2">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-4 py-3 text-base font-semibold text-[#071B38] hover:bg-[#EAF0F3]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-4 py-3 text-base font-semibold text-[#071B38] hover:bg-[#EAF0F3]"
                  >
                    Log in
                  </Link>
                </li>
              </ul>
              <div className="mt-4 px-4 pb-2">
                <Link
                  href="/interview"
                  onClick={() => setOpen(false)}
                  className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#071B38] text-[14px] font-semibold text-white"
                >
                  Get your assessment <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
