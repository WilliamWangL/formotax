import { buildMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Terms of service',
  description:
    'The terms that govern use of the FormoTax online tax form filler, including acceptable use, pay-per-download pricing, payments and liability.',
  path: '/terms',
});

const updated = 'November 18, 2026';

export default function TermsPage() {
  return (
    <div className="container-page py-14">
      <article className="prose-form max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Terms of service</h1>
        <p className="mt-2 text-xs text-slate-500">Last updated: {updated}</p>

        <p>
          These terms form an agreement between you and {siteConfig.legalName} for use of{' '}
          {siteConfig.name}. By using the site you accept them. If you do not agree, do not use the
          service.
        </p>

        <h2>1. The service</h2>
        <p>
          {siteConfig.name} provides a browser-based filler for selected government forms. We supply
          the official PDF template, validate the values you enter and render the completed document
          on your device. We are not the issuing agency and are not affiliated with the Internal
          Revenue Service.
        </p>

        <h2>2. No tax, legal or accounting advice</h2>
        <p>
          The service is a document preparation tool. Content on the site is general information and
          does not constitute tax, legal or accounting advice. We do not determine your tax
          classification, treaty eligibility or withholding rate. You are responsible for the
          accuracy of the information you submit and for confirming that the completed form is
          appropriate for your situation. Consult a qualified professional when unsure.
        </p>

        <h2>3. Your responsibilities</h2>
        <ul>
          <li>Enter accurate information that matches official records.</li>
          <li>Use only your own identity, or an identity you are authorised to represent.</li>
          <li>Sign only documents you are legally entitled to sign.</li>
          <li>Deliver the completed form to the requester; do not send it to the IRS.</li>
          <li>Keep your account credentials confidential.</li>
        </ul>

        <h2>4. Official forms and revisions</h2>
        <p>
          Templates are taken from official publications and versioned by revision date. We make
          reasonable efforts to keep them current, but the issuing agency may change a form, its
          instructions or its acceptance rules at any time. Always confirm the current revision on
          the official website before relying on a document.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You may not:</p>
        <ul>
          <li>Use the service to commit fraud, impersonate another person or falsify a tax document.</li>
          <li>Attempt to disrupt, scrape at scale, reverse engineer the billing system or bypass download payments.</li>
          <li>Resell generated documents as a filing service without a written agreement.</li>
          <li>Upload malware or use the service in violation of applicable law.</li>
        </ul>
        <p>
          We may suspend or terminate access if we reasonably believe these rules have been broken.
        </p>

        <h2>6. Accounts</h2>
        <p>
          You must provide a valid email address and keep your password secure. An account is
          required to pay for a download and to re-download a document you already unlocked. You
          are responsible for activity under your account. You may delete your account at any time
          from the dashboard; we will remove account data as described in the privacy policy.
        </p>

        <h2>7. Pricing, payments and refunds</h2>
        <ul>
          <li>
            Filling, validating and previewing a form is free of charge. A fee of USD 1 is charged
            only when you download a completed PDF.
          </li>
          <li>
            Each payment unlocks downloads of that one document for 24 hours from the moment the
            payment is confirmed. After that window a new payment is required.
          </li>
          <li>
            Prices are shown before payment and may change at any time; the price displayed at
            checkout applies to that order.
          </li>
          <li>
            Payments are processed by PayPal. Except where required by law, fees are
            non-refundable once the download has been unlocked.
          </li>
          <li>
            If a payment is confirmed but the download does not unlock, contact us and we will
            restore access or refund the charge.
          </li>
        </ul>

        <h2>8. Intellectual property</h2>
        <p>
          The website, its code, text and design are owned by {siteConfig.legalName} or its
          licensors. Government forms are public documents and are not claimed by us. You receive a
          limited, non-exclusive licence to use the generated PDF for your own lawful purposes.
        </p>

        <h2>9. Availability and changes</h2>
        <p>
          The service is provided on an &ldquo;as available&rdquo; basis. We may modify, suspend or
          discontinue features, and we do not guarantee uninterrupted availability. Scheduled
          maintenance is announced on the site where practical.
        </p>

        <h2>10. Disclaimer of warranties</h2>
        <p>
          To the maximum extent permitted by law, the service is provided without warranties of any
          kind, express or implied, including merchantability, fitness for a particular purpose and
          non-infringement. We do not warrant that a completed form will be accepted by any
          requester or agency.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {siteConfig.legalName} is not liable for indirect,
          incidental, special, consequential or punitive damages, or for lost profits, data or
          business opportunity. Our aggregate liability for any claim relating to the service is
          limited to the greater of the amount you paid us in the twelve months before the claim or
          USD 100. Nothing in these terms limits liability that cannot be limited by law.
        </p>

        <h2>12. Indemnity</h2>
        <p>
          You agree to indemnify us against claims arising from your misuse of the service, your
          violation of these terms or content you submitted in breach of third-party rights.
        </p>

        <h2>13. Governing law and disputes</h2>
        <p>
          These terms are governed by the laws of {siteConfig.legal.governingLaw}, without regard to
          conflict-of-law rules. Disputes will be brought in the courts located in that jurisdiction,
          unless mandatory consumer law provides otherwise.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>{' '}
          or {siteConfig.legal.entityAddress}.
        </p>
      </article>
    </div>
  );
}
