import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import type { FormDefinition } from '@tax/shared-types';

const accents: Record<string, string> = {
  W9: 'bg-brand-50 text-brand-800',
  W4: 'bg-sky-50 text-sky-800',
  W8BEN: 'bg-amber-50 text-amber-800',
  W8BENE: 'bg-violet-50 text-violet-800',
};

export function FormCard({ form }: { form: FormDefinition }) {
  return (
    <Link
      href={form.seo.landingPath}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-colors hover:border-brand-300"
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
            accents[form.code] ?? 'bg-slate-100 text-slate-700'
          }`}
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {form.code === 'W8BENE' ? 'W-8BEN-E' : form.shortTitle.replace('Form ', '')}
        </span>
        <span className="text-xs text-slate-500">{form.pdf.revision.replace('Rev. ', '')}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink group-hover:text-brand-700">
        {form.shortTitle}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-600">{form.audience}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>~{form.estimatedMinutes} min</span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
          Fill online
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
