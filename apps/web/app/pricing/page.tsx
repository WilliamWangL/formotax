import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { buildMetadata } from '@/lib/metadata';
import { downloadOffer, siteConfig } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Pricing: fill tax forms free, $1 per download',
  description:
    'Filling, validating and previewing IRS Form W-9, W-4, W-8BEN and W-8BEN-E is free. Pay $1 only when you download the completed PDF, and re-download it free for 24 hours.',
  path: '/pricing',
  keywords: ['tax form generator pricing', 'w9 generator price', 'pay per download tax form'],
});

const steps = [
  {
    title: 'Fill and preview for free',
    text: 'Every form, every field and the page-one preview are free and do not require a subscription.',
  },
  {
    title: 'Pay $1 when you download',
    text: 'The price is charged once per saved document, at checkout, before the file leaves the preview.',
  },
  {
    title: 'Re-download for 24 hours',
    text: 'The same document stays unlocked for 24 hours, so a lost file or a second copy never costs twice.',
  },
];

const billingFaq = [
  {
    q: 'Is filling a form really free?',
    a: 'Yes. You can complete any of the four forms, sign on screen and preview the official PDF without paying. The $1 charge applies only when you save the finished document.',
  },
  {
    q: 'Do I have to pay again if I download the same PDF twice?',
    a: `No. Each paid download unlocks that form for ${downloadOffer.accessHours} hours, so you can save it again — on this device or after signing in elsewhere — without a second charge.`,
  },
  {
    q: 'Do I need an account?',
    a: 'You need a free account to pay and download, so the purchase and its 24-hour re-download window can be recognised on any device. Filling and previewing never require an account.',
  },
  {
    q: 'Is there a subscription or automatic renewal?',
    a: 'No. There are no plans, no monthly fees and nothing to cancel. You pay $1 per downloaded document and nothing else.',
  },
  {
    q: 'Do you store completed PDFs?',
    a: `No. Documents are generated in your browser. ${siteConfig.name} only stores account details and download receipts.`,
  },
];

export default function PricingPage() {
  const offerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: `${siteConfig.name} — pay per download`,
    description:
      'Fill official IRS tax forms for free and pay $1 to download the completed PDF.',
    price: downloadOffer.price,
    priceCurrency: downloadOffer.currency,
    url: `${siteConfig.url}/pricing`,
    availability: 'https://schema.org/InStock',
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: billingFaq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="container-page py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Pricing</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Filling a tax form is free. You pay ${downloadOffer.price.toFixed(2)} only when you
          download the completed PDF — no plans, no monthly fee, no renewal.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-brand-300 bg-white p-6 shadow-card ring-1 ring-brand-200">
          <h2 className="text-lg font-semibold text-ink">{downloadOffer.name}</h2>
          <p className="mt-4 text-4xl font-semibold text-ink">
            ${downloadOffer.price}
            <span className="text-sm font-normal text-slate-500"> per download</span>
          </p>
          <p className="mt-1 text-sm font-medium text-brand-700">
            Filling and previewing are always free
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{downloadOffer.tagline}</p>
          <ul className="mt-5 space-y-2">
            {downloadOffer.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
          <ButtonLink href="/forms/w9/fill" className="mt-6 w-full">
            {downloadOffer.cta}
          </ButtonLink>
          <p className="mt-2 text-center text-xs text-slate-500">
            A free account is needed only when you pay.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">How billing works</h2>
          <ol className="mt-4 space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-ink">Payment details</p>
            <p className="mt-2">
              Payments are processed by PayPal in US dollars. Prices exclude applicable taxes. Each
              download is a one-off purchase; form answers and signatures are never part of the
              payment request.
            </p>
          </div>
        </section>
      </div>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <h2 className="sr-only">Billing questions</h2>
        {billingFaq.map((item) => (
          <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-ink">{item.q}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
          </div>
        ))}
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
