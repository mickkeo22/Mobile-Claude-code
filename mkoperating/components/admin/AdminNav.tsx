'use client';

// Admin shell navigation: sidebar on desktop, fixed bottom tab bar on mobile
// (the operator mostly runs this from a phone).

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Send, FileText, LogOut, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/leads', label: 'Leads', icon: Users, exact: false },
  { href: '/admin/outbound', label: 'Outbound', icon: Send, exact: false },
  { href: '/admin/content', label: 'Content', icon: FileText, exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside className="hidden w-56 shrink-0 border-r border-ink/10 bg-white md:flex md:flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-sm font-extrabold text-signal">
          MK
        </span>
        <span className="font-display text-sm font-extrabold">Command center</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3" aria-label="Admin">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-sm font-bold transition-colors',
              isActive(pathname, item.href, item.exact)
                ? 'bg-ink text-paper'
                : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-ink/10 p-3">
        <a
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 font-display text-sm font-bold text-ink/50 hover:bg-ink/5 hover:text-ink"
        >
          <ExternalLink className="h-4 w-4" /> View site
        </a>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-display text-sm font-bold text-ink/50 hover:bg-ink/5 hover:text-ink"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </aside>
  );
}

export function AdminBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Admin"
    >
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            'flex flex-1 flex-col items-center gap-1 py-2.5 font-display text-[0.65rem] font-bold',
            isActive(pathname, item.href, item.exact) ? 'text-ink' : 'text-ink/40'
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
