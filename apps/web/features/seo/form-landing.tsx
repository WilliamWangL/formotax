import Link from 'next/link';
import { ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import type { FormDefinition } from '@tax/shared-types';
import { listForms, fillPath } from '@tax/tax-form-engine';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/card';
import { siteConfig } from '@/lib/site';

/**
 * SEO landing page used both by /tax-forms/[slug] and by the keyword routes
 * such as /w9-form-generator. The content comes from the form definition so a
 * new form automatically ships with its landing page and structured data.
 */
export function FormLanding({ form }: { form: FormDefinition }) {
  const related = listForms().filter((item) => item.code !== form.code);
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: form.seo.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${siteConfig.name} — ${form.shortTitle} filler`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any modern browser',
    url: `${siteConfig.url}${form.seo.landingPath}`,
    description: form.seo.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'Fill official IRS PDF fields',
      'Handwritten signature on screen',
      'Flattened print-ready download',
      'No upload of tax data',
    ],
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'Tax forms', item: `${siteConfig.url}/tax-forms` },
      {
        '@type': 'ListItem',
        position: 3,
        name: form.shortTitle,
        item: `${siteConfig.url}${form.seo.landingPath}`,
      },
    ],
  };
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${siteConfig.url}${form.seo.landingPath}`,
    url: `${siteConfig.url}${form.seo.landingPath}`,
    name: form.seo.title,
    description: form.seo.description,
    inLanguage: 'en-US',
    dateModified: form.lastReviewed,
    primaryImageOfPage: `${siteConfig.url}${siteConfig.ogImage}`,
    isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: siteConfig.url },
    about: {
      '@type': 'WebApplication',
      name: `${form.shortTitle} filler`,
      applicationCategory: 'FinanceApplication',
    },
  };

  return (
    <>
      <div className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="container-page py-14">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/tax-forms" className="hover:text-brand-700">
              Tax forms
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">{form.shortTitle}</span>
          </nav>

          <div className="mt-5 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{form.pdf.revision}</Badge>
                <Badge>{form.pdf.catalogNumber}</Badge>
                <Badge tone="neutral">~{form.estimatedMinutes} minutes</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {form.seo.h1}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{form.seo.intro}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={fillPath(form)} size="lg">
                  Fill {form.shortTitle} online
                </ButtonLink>
                <ButtonLink href="/tax-forms" size="lg" variant="outline">
                  Compare forms
                </ButtonLink>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
                Generated in your browser from the official IRS PDF. No account needed.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-sm font-semibold text-ink">Form facts</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Issuer</dt>
                  <dd className="text-right font-medium text-slate-800">{form.agency}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Revision</dt>
                  <dd className="text-right font-medium text-slate-800">{form.pdf.revision}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Who signs</dt>
                  <dd className="text-right font-medium text-slate-800">{form.audience}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Pages</dt>
                  <dd className="text-right font-medium text-slate-800">{form.pdf.pages}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Last reviewed</dt>
                  <dd className="text-right font-medium text-slate-800">
                    <time dateTime={form.lastReviewed}>{form.lastReviewed}</time>
                  </dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                <a
                  className="flex items-center gap-1.5 text-brand-700 hover:underline"
                  href={form.officialUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Official IRS PDF <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                <a
                  className="flex items-center gap-1.5 text-brand-700 hover:underline"
                  href={form.instructionsUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  IRS instructions <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                <a
                  className="flex items-center gap-1.5 text-brand-700 hover:underline"
                  href={`/api/ai/forms/${form.slug}/markdown`}
                >
                  Machine-readable summary (Markdown)
                </a>
                <a
                  className="flex items-center gap-1.5 text-brand-700 hover:underline"
                  href={`/api/ai/forms/${form.slug}`}
                >
                  Field map and steps (JSON)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_320px]">
        <article className="prose-form">
          {form.seo.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <h2>Frequently asked questions</h2>
          <dl className="not-prose mt-4 space-y-4">
            {form.seo.faq.map((item) => (
              <div key={item.question} className="rounded-xl border border-slate-200 bg-white p-5">
                <dt className="text-sm font-semibold text-ink">{item.question}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</dd>
              </div>
            ))}
          </dl>

          <h2>Disclaimers</h2>
          <ul>
            {form.disclaimers.map((disclaimer) => (
              <li key={disclaimer}>{disclaimer}</li>
            ))}
          </ul>
        </article>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">Fill this form</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              The wizard matches the order of the official PDF and checks each field before you
              download.
            </p>
            <ButtonLink href={fillPath(form)} className="mt-4 w-full">
              Start {form.shortTitle}
            </ButtonLink>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">Related forms</h2>
            <ul className="mt-3 space-y-3">
              {related.map((item) => (
                <li key={item.code}>
                  <Link
                    href={item.seo.landingPath}
                    className="group flex items-start justify-between gap-2"
                  >
                    <span>
                      <span className="block text-sm font-medium text-slate-800 group-hover:text-brand-700">
                        {item.shortTitle}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {item.audience}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
    </>
  );
}
