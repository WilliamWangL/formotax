'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, FileText, LayoutDashboard, Loader2, LogOut, WifiOff } from 'lucide-react';
import { cn } from '@tax/ui';
import type { PublicUser } from '@tax/shared-types';
import { ApiRequestError, fetchMe, logout, readTokens, writeTokens } from '@/lib/api';
import { SessionProvider, type SessionState } from '@/features/dashboard/session';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/forms', label: 'My forms', icon: FileText },
  { href: '/dashboard/downloads', label: 'Downloads', icon: Download },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [apiReachable, setApiReachable] = useState(true);

  useEffect(() => {
    if (!readTokens()) {
      router.replace('/login?next=/dashboard');
      return;
    }
    let active = true;
    fetchMe()
      .then((profile) => {
        if (!active) return;
        setUser(profile);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          writeTokens(null);
          router.replace('/login?next=/dashboard');
          return;
        }
        setApiReachable(false);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const session = useMemo<SessionState>(() => ({ user, ready, apiReachable }), [user, ready, apiReachable]);

  if (!ready) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center py-20 text-sm text-slate-500">
        <h1 className="sr-only">Dashboard</h1>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        Checking your session…
      </div>
    );
  }

  const signOut = async () => {
    await logout();
    router.push('/');
  };

  return (
    <SessionProvider value={session}>
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Account
              </p>
              <p className="truncate px-2 text-sm font-medium text-ink">
                {user?.email ?? 'Signed in'}
              </p>
              <nav className="mt-3 space-y-1" aria-label="Dashboard">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={signOut}
                className="mt-3 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
            <p className="mt-4 px-2 text-xs leading-5 text-slate-500">
              Form answers stay in this browser. Only your email and download receipts are synced.
            </p>
          </aside>

          <div className="min-w-0">
            {!apiReachable ? (
              <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  The account service is unavailable, so this page shows data stored in your
                  browser. Filling and previewing keep working; downloads need the service.
                </span>
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
