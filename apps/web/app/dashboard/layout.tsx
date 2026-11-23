import type { ReactNode } from 'react';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
  title: 'Dashboard',
  description: 'Your FormoTax downloads, unlocked documents and saved drafts.',
  path: '/dashboard',
  noIndex: true,
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
