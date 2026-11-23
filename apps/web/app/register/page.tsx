import Link from 'next/link';
import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuthForm } from '@/features/auth/auth-form';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata({
  title: 'Create an account',
  description:
    'Create a free FormoTax account to pay $1 per download, re-download your documents and keep your drafts.',
  path: '/register',
  noIndex: true,
});

export default function RegisterPage() {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            No subscription
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Fill and preview every form for free. Pay $1 only when you download a PDF — no subscription, no monthly fee.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading form…</p>}>
            <AuthForm mode="register" />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-brand-700 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
