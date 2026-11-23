import { buildMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Frequently asked questions',
  description:
    'Answers about filling IRS forms online: signatures, official revisions, privacy, TIN formatting and the $1 pay-per-download price.',
  path: '/faq',
  keywords: ['w9 faq', 'w8ben questions', 'electronic signature tax form'],
});

const groups = [
  {
    title: 'Using the filler',
    items: [
      {
        q: 'Which forms can I complete here?',
        a: 'Four forms are available: Form W-9 (Rev. March 2024), Form W-4 (2026), Form W-8BEN (Rev. October 2021) and Form W-8BEN-E (Rev. October 2021). Each one follows the official field order and validation rules.',
      },
      {
        q: 'Do I need an account or an email address?',
        a: 'Filling, validating and previewing a form needs no account. To download the finished PDF you sign in and pay $1 for that document, so keep the payment and receipt tied to an email address.',
      },
      {
        q: 'How long does it take?',
        a: 'Most people finish a W-9 in three or four minutes. W-8BEN-E takes longer because it asks about entity status and treaty claims.',
      },
      {
        q: 'Can I use this on a phone?',
        a: 'Yes. The wizard, signature pad and preview work on modern mobile browsers. Download the PDF and send it using your usual email or file-sharing app.',
      },
    ],
  },
  {
    title: 'Official forms and revisions',
    items: [
      {
        q: 'Is the output the official IRS PDF?',
        a: 'Yes. We ship the official fillable PDF published by the IRS, write your answers directly into its AcroForm fields, and flatten the document. The revision and catalog number printed in the footer match the IRS file.',
      },
      {
        q: 'What happens when the IRS publishes a new revision?',
        a: 'We add the new revision as a separate template version. Documents you generated earlier remain unchanged, and the site always points to the current revision.',
      },
      {
        q: 'Are the instructions included?',
        a: 'The IRS page-one instructions that are part of each PDF stay in place. Links to the full official instructions are included on the form page and inside the wizard.',
      },
    ],
  },
  {
    title: 'Signatures',
    items: [
      {
        q: 'Is a drawn signature acceptable?',
        a: 'The IRS requires a signature on these forms. A handwritten-style signature image drawn on screen is accepted by most requesters. Some organisations insist on a specific e-signature platform, so confirm their policy before sending.',
      },
      {
        q: 'Where is my signature stored?',
        a: 'The signature image exists only in the browser tab while you work. It is embedded into the PDF you download and is never saved in drafts or uploaded.',
      },
      {
        q: 'What date is printed on the form?',
        a: 'The date you enter in the signature step, which defaults to today. You can change it before generating the PDF.',
      },
    ],
  },
  {
    title: 'Privacy and security',
    items: [
      {
        q: 'Do you see my SSN or EIN?',
        a: 'No. Form filling, validation and PDF generation happen in your browser using a template downloaded from this site. Sensitive numbers are not sent to our servers, written to analytics, or included in URLs.',
      },
      {
        q: 'What is stored on my device?',
        a: 'Answers are saved as a draft in local storage so you can continue later. Signatures are excluded. You can clear the draft with one button in the wizard or from the dashboard.',
      },
      {
        q: 'Do you keep completed PDFs?',
        a: `No. ${siteConfig.name} does not store generated documents. Your account only contains profile data, purchase records for downloads and optional draft answers.`,
      },
    ],
  },
  {
    title: 'Pricing and downloads',
    items: [
      {
        q: 'What does it cost?',
        a: 'Filling, validating and previewing a form is free. Downloading the finished PDF costs USD 1 per document. There is no subscription and no monthly fee.',
      },
      {
        q: 'What does the $1 cover?',
        a: 'One download of one completed form. The payment also unlocks free re-downloads of that same document for 24 hours, so you can fix a typo or grab a second copy without paying again.',
      },
      {
        q: 'How do I pay?',
        a: 'Sign in, click Download PDF and complete the PayPal checkout in the pop-up window. The download unlocks automatically as soon as the payment is confirmed.',
      },
      {
        q: 'Where can I see my receipts?',
        a: 'Open Dashboard → Downloads. It lists current unlocks, their expiry time and every past order with its order number.',
      },
      {
        q: 'Do you offer refunds?',
        a: 'Fees are non-refundable once the download has been unlocked, except where required by law. If a payment succeeded but the file did not unlock, email us and we will restore access or refund the charge.',
      },
    ],
  },
];

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    ),
  };

  return (
    <div className="container-page py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Frequently asked questions</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Everything about official PDFs, signatures, privacy and the $1 download price. Still unsure? Email{' '}
          <a className="font-medium text-brand-700 underline" href={`mailto:${siteConfig.email}`}>
            {siteConfig.email}
          </a>
          .
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="FAQ sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-2 text-sm">
            {groups.map((group) => (
              <li key={group.title}>
                <a
                  href={`#${group.title.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                  className="text-slate-600 hover:text-brand-700"
                >
                  {group.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.title} id={group.title.toLowerCase().replace(/[^a-z]+/g, '-')}>
              <h2 className="text-xl font-semibold text-ink">{group.title}</h2>
              <div className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-slate-200 bg-white p-4 open:bg-slate-50/60"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
                      <span className="flex items-center justify-between gap-3">
                        {item.q}
                        <span className="text-slate-400 group-open:rotate-45" aria-hidden>
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
