import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { listForms } from '@tax/tax-form-engine';
import { Badge } from '@/components/ui/card';
import { buildMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'All IRS forms you can fill online',
  description:
    'Compare Form W-9, W-4, W-8BEN and W-8BEN-E: who needs each form, which revision we support, and how long the wizard takes.',
  path: '/tax-forms',
  keywords: ['irs forms online', 'w9 w4 w8ben', 'tax form filler comparison'],
});

export default function TaxFormsPage() {
  const forms = listForms();
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'IRS forms available on FormoTax',
    numberOfItems: forms.length,
    itemListElement: forms.map((form, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: form.shortTitle,
      url: `${siteConfig.url}${form.seo.landingPath}`,
    })),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'Tax forms', item: `${siteConfig.url}/tax-forms` },
    ],
  };

  return (
    <div className="container-page py-14">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">Tax forms</span>
      </nav>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        Tax forms you can fill online
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        Four IRS forms cover most cross-border and contractor paperwork. Each filler uses the
        official PDF revision listed below and runs entirely in your browser.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Form</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Who signs it</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Revision</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {forms.map((form) => (
              <tr key={form.code} className="align-top hover:bg-slate-50/60">
                <td className="px-4 py-4">
                  <Link
                    href={form.seo.landingPath}
                    className="font-semibold text-ink hover:text-brand-700"
                  >
                    {form.shortTitle}
                  </Link>
                  <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                    {form.description}
                  </p>
                </td>
                <td className="hidden px-4 py-4 text-slate-600 sm:table-cell">{form.audience}</td>
                <td className="hidden px-4 py-4 md:table-cell">
                  <Badge tone="brand">{form.pdf.revision}</Badge>
                </td>
                <td className="px-4 py-4 text-slate-600">~{form.estimatedMinutes} min</td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/forms/${form.code.toLowerCase()}/fill`}
                    className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-brand-700 hover:underline"
                  >
                    Fill
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-ink">Not sure which form you need?</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>
              <strong className="text-slate-800">W-9</strong> — you are a U.S. person and a client
              asks for your TIN before paying you.
            </li>
            <li>
              <strong className="text-slate-800">W-4</strong> — you started a job in the United
              States and must tell your employer how much tax to withhold.
            </li>
            <li>
              <strong className="text-slate-800">W-8BEN</strong> — you are an individual who is not
              a U.S. person and receive U.S. source income.
            </li>
            <li>
              <strong className="text-slate-800">W-8BEN-E</strong> — the same as W-8BEN, but for an
              entity such as a company or trust.
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-6">
          <h2 className="text-base font-semibold text-ink">What you get</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            <li>Official IRS PDF with your data typed into the real AcroForm fields.</li>
            <li>A flattened file, so the layout cannot shift on another device.</li>
            <li>Signature and date placed on the official signature line.</li>
            <li>Nothing uploaded unless you choose to save a draft in an account.</li>
          </ul>
          <Link
            href="/forms/w9/fill"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            Try it with Form W-9
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
