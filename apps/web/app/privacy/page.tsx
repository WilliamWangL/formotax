import { buildMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';

export const metadata = buildMetadata({
  title: 'Privacy policy',
  description:
    'How FormoTax handles personal data: browser-side PDF generation, what is stored in an account, cookies, retention and your rights.',
  path: '/privacy',
});

const updated = 'November 18, 2026';

export default function PrivacyPage() {
  return (
    <div className="container-page py-14">
      <article className="prose-form max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Privacy policy</h1>
        <p className="mt-2 text-xs text-slate-500">Last updated: {updated}</p>

        <p>
          This policy explains what {siteConfig.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
          processes when you use {siteConfig.name}. It applies to the website and the PDF generator.
          It does not cover third-party sites you reach through links.
        </p>

        <h2>1. The short version</h2>
        <ul>
          <li>
            Form answers, including SSN, EIN, foreign TIN and your signature, are processed in your
            browser. They are not transmitted to us when you generate a PDF.
          </li>
          <li>
            We store account data (name, email, hashed password), download orders and payment
            metadata. We do not store completed PDFs.
          </li>
          <li>Drafts stay in your device storage and can be cleared at any time.</li>
        </ul>

        <h2>2. Data we process</h2>
        <h3>2.1 Data you type into a form</h3>
        <p>
          Form values are handled locally by JavaScript running in your browser. The template PDF is
          downloaded from our static file host, and the filled document is produced on your device.
          We do not receive the values, the signature image or the generated PDF. If you choose to
          save a draft to your account, only the answers you confirm are transmitted, and signatures
          are excluded.
        </p>

        <h3>2.2 Account data</h3>
        <p>
          If you create an account we process your name, email address, a bcrypt hash of your
          password, account status and the download orders you place. Authentication uses a signed
          token stored in your browser.
        </p>

        <h3>2.3 Payment data</h3>
        <p>
          Downloads are paid per document through PayPal. We send PayPal the form code, amount and
          an internal order reference, and PayPal returns a transaction identifier and payment
          status. We never see or store card numbers, bank account numbers or PayPal credentials;
          the payment details you enter on PayPal are governed by PayPal&rsquo;s own privacy policy.
        </p>

        <h3>2.4 Technical data</h3>
        <p>
          Our servers keep short-lived access logs (IP address, user agent, requested URL, response
          status, timestamp) for security and abuse prevention. Query strings are stripped from
          application logs, and no form field values are ever written to logs.
        </p>

        <h3>2.5 Cookies and local storage</h3>
        <p>
          We use a strictly necessary cookie or local storage entry for your session, and local
          storage for drafts and for remembering which documents you unlocked on this device. We do
          not use advertising cookies.
          If analytics are enabled, they are configured without cross-site tracking and never
          receive form values.
        </p>

        <h2>3. Why we process data</h2>
        <ul>
          <li>To provide the service you request (contract performance).</li>
          <li>To secure the service, prevent abuse and enforce payment for downloads (legitimate interest).</li>
          <li>To process payments and meet accounting obligations (legal obligation).</li>
          <li>To answer support requests you send us (legitimate interest or consent).</li>
        </ul>

        <h2>4. What we never do</h2>
        <ul>
          <li>We do not sell personal data.</li>
          <li>We do not use form answers to train machine-learning models.</li>
          <li>We do not include tax identifiers in URLs, analytics events or support tooling.</li>
          <li>We do not share data with advertisers.</li>
        </ul>

        <h2>5. Service providers</h2>
        <p>
          We use infrastructure providers for hosting, a database for account and order records, a
          private object store for template files and a payment processor for download payments.
          Each provider is bound by a data processing agreement and processes data only on our
          instructions. Template files contain no personal data.
        </p>

        <h2>6. Retention</h2>
        <ul>
          <li>Account records: kept while your account is active, then deleted within 30 days.</li>
          <li>Download orders: kept while your account is active and afterwards as long as tax and accounting law requires.</li>
          <li>Access logs for paid downloads: kept for 30 days.</li>
          <li>Payment records: kept as long as tax and accounting law requires.</li>
          <li>Server logs: kept for 30 days, then deleted automatically.</li>
          <li>Local drafts: kept on your device until you clear them.</li>
        </ul>

        <h2>7. Your rights</h2>
        <p>
          Depending on where you live you may request access, correction, deletion, restriction,
          portability or object to processing. Email{' '}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> and we will respond within the
          period required by applicable law. You may also lodge a complaint with your local data
          protection authority.
        </p>

        <h2>8. International transfers</h2>
        <p>
          Our providers may process account data in the United States and the European Economic
          Area. Where required, transfers rely on Standard Contractual Clauses or an adequacy
          decision.
        </p>

        <h2>9. Children</h2>
        <p>
          The service is intended for adults handling their own tax paperwork. We do not knowingly
          collect data from children under 16.
        </p>

        <h2>10. Changes and contact</h2>
        <p>
          We will post any material change to this policy on this page and update the date above.
          Questions can be sent to <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> or
          by mail to {siteConfig.legal.entityAddress}.
        </p>
      </article>
    </div>
  );
}
