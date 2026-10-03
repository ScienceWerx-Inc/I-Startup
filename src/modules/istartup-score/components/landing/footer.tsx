import Link from 'next/link';

import { cn } from '@/lib/utils';

import { Wordmark } from '../chrome';
import { NAV_LINKS } from './data';
import { container } from './ui';

export function Footer() {
  return (
    <footer className="border-t border-edge bg-surface">
      <div className={cn(container, 'flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between')}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
          <Link href="/" aria-label="iSTARTUP Score home" className="w-fit rounded-md">
            <Wordmark />
          </Link>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="text-sm text-fg-muted">© {new Date().getFullYear()} ScienceWerx · iSTARTUP Score. All rights reserved.</p>
      </div>
    </footer>
  );
}
