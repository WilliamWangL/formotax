import Link from 'next/link';
import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuthForm } from '@/features/auth/auth-form';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
  title: 'Sign in',
  description:
    'Sign in to FormoTax to pay for a download, re-download a document you already unlocked and keep your drafts in one place.',
  path: '/login',
  noIndex: true,
});

export default function LoginPage() {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Sign in to download
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Filling forms is always free. An account is only needed to pay $1 for a download and to re-download documents you already unlocked.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading form…</p>}>
            <AuthForm mode="login" />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{' '}
          <Link href="/register" className="font-medium text-brand-700 underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
