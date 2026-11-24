'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Errors thrown while React commits DOM changes (which is what happens when
    // a browser extension or page translator rewrites nodes underneath it) never
    // reach the console on their own once a boundary is present, so log it.
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-xl text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">
          Something went wrong on this page
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Nothing was submitted and your answers are still saved in this browser. Try again to
          re-render the page — if it keeps failing, use a normal (not private) window with page
          translation and browser extensions turned off.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/tax-forms"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-brand-400 hover:text-brand-700"
          >
            Back to all forms
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-8 text-xs text-slate-400">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
