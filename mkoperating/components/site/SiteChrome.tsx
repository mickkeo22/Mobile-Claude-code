'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/our-work', label: 'Our work' },
  { href: '/testimonials', label: 'Testimonials' },
  { href: '/sample-audit', label: 'Sample audit' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-sm font-extrabold text-signal">
            MK
          </span>
          <span className="font-display text-[0.95rem] font-extrabold tracking-tight">
            MK Operating
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'font-display text-sm font-bold transition-colors',
                pathname === item.href ? 'text-ink' : 'text-ink/60 hover:text-ink'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/audit" className="btn-primary !px-4 !py-2">
            Get your free audit
          </Link>
        </nav>

        <button
          className="rounded-lg p-2 hover:bg-ink/5 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink/10 bg-paper px-5 pb-5 pt-2 md:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-3 font-display text-base font-bold text-ink/80 hover:bg-ink/5"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/audit" onClick={() => setOpen(false)} className="btn-primary mt-3 w-full">
            Get your free audit →
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-paper-200/60">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-extrabold">MK Operating Company</p>
          <p className="mt-1 text-sm text-ink/60">
            Automation for local service businesses. Stop leaking money.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/60" aria-label="Footer">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
          <Link href="/book" className="hover:text-ink">
            Book a call
          </Link>
          <Link href="/audit" className="font-bold text-signal-700 hover:text-ink">
            Free audit →
          </Link>
        </nav>
      </div>
    </footer>
  );
}
