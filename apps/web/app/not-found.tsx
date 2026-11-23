import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { listForms, fillPath } from '@tax/tax-form-engine';

export default function NotFound() {
  const forms = listForms();

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-xl text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <FileQuestion className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">Page not found</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          The page you were looking for does not exist. All four form fillers are still one click
          away.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/tax-forms" variant="outline">
            Browse all forms
          </ButtonLink>
        </div>

        <ul className="mt-10 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-left">
          {forms.map((form) => (
            <li key={form.code} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-sm font-medium text-ink">{form.shortTitle}</span>
              <Link href={fillPath(form)} className="text-xs font-medium text-brand-700 underline">
                Fill out
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
