import { buildMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'About the team behind the tax form filler',
  description:
    'Why we built a browser-first filler for the IRS W-9, W-4, W-8BEN and W-8BEN-E, how official templates are maintained, and how we handle privacy.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="container-page py-14">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">About {siteConfig.name}</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {siteConfig.name} exists because filling a one-page tax form should not require a printer,
          a scanner and a PDF editor. We build a narrow set of tools: official IRS and cross-border
          forms, filled accurately, signed on screen and delivered as a clean PDF.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-ink">Principles</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            {
              title: 'Official documents only',
              text: 'We never imitate a government form with HTML. Every output is the published PDF, filled field by field and flattened.',
            },
            {
              title: 'Privacy by architecture',
              text: 'Sensitive values stay in the browser. There is no server-side copy of your name, TIN or signature to breach or subpoena.',
            },
            {
              title: 'Explain, then automate',
              text: 'Each form page explains who the form is for, common mistakes and the official instructions before you start typing.',
            },
            {
              title: 'Boring reliability',
              text: 'Templates are checksummed, field mappings are covered by automated tests, and revisions are versioned rather than overwritten.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-xl font-semibold text-ink">How the documents are produced</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
          <li>
            The official fillable PDF is downloaded from irs.gov, hashed with SHA-256 and stored as a
            versioned template.
          </li>
          <li>
            Every AcroForm field is inspected and mapped to a logical field in the wizard, including
            checkbox groups on multi-page forms.
          </li>
          <li>
            In your browser, answers are written into those fields with pdf-lib, the signature image
            is placed on the official signature line and appearances are flattened.
          </li>
          <li>
            Filling, validating, signing and previewing the form are free. When you are ready, a
            one-time $1 payment per document unlocks the download and any re-download of that same
            file for 24 hours.
          </li>
          <li>
            You review the result with the built-in PDF viewer and download it directly from the
            blob URL created on your device.
          </li>
        </ol>

        <h2 className="mt-10 text-xl font-semibold text-ink">What we are not</h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          We are not the IRS, not a law firm and not a tax adviser. We cannot tell you which
          classification or treaty rate applies to your situation. The information on this site is
          general, and the official instructions always control.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-ink">Contact</h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Questions, bug reports and template revision requests:{' '}
          <a className="font-medium text-brand-700 underline" href={`mailto:${siteConfig.email}`}>
            {siteConfig.email}
          </a>
          . Support hours are {siteConfig.supportHours}. Mailing address:{' '}
          {siteConfig.legal.entityAddress}.
        </p>
      </div>
    </div>
  );
}
