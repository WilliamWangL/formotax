/** Central site configuration: branding, navigation, pricing and contact details. */

export const siteConfig = {
  name: 'FormoTax',
  legalName: 'FormoTax LLC',
  tagline: 'Official IRS forms, filled in your browser',
  description:
    'Online filler for IRS Form W-9, W-4, W-8BEN and W-8BEN-E. Fill, sign and preview for free, then pay $1 to download the print-ready PDF — without uploading your tax data.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://formotax.ecommica.com',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  locale: 'en-US',
  email: 'support@formotax.com',
  supportHours: 'Monday to Friday, 9:00–18:00 (US Eastern)',
  /** Shared 1200x630 social card, also used by structured data. */
  ogImage: '/og/formotax.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterHandle: '@formotax',
  social: {
    x: 'https://x.com/formotax',
    linkedin: 'https://www.linkedin.com/company/formotax',
  },
  legal: {
    entityAddress: '1201 N Orange Street, Suite 700, Wilmington, DE 19801, USA',
    governingLaw: 'Delaware, United States',
  },
} as const;

export const primaryNav = [
  { href: '/tax-forms', label: 'All forms' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
] as const;

export const footerNav = [
  {
    title: 'Forms',
    links: [
      { href: '/tax-forms/w-9', label: 'W-9 generator' },
      { href: '/tax-forms/w-4', label: 'W-4 generator' },
      { href: '/tax-forms/w-8ben', label: 'W-8BEN generator' },
      { href: '/tax-forms/w-8ben-e', label: 'W-8BEN-E generator' },
    ],
  },
  {
    title: 'Product',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/faq', label: 'FAQ' },
      { href: '/about', label: 'About us' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
      { href: '/llms.txt', label: 'llms.txt' },
    ],
  },
] as const;

/**
 * Pay-per-download pricing. Filling, validating and previewing a form is free;
 * saving the completed PDF costs a flat fee and unlocks re-downloads for a
 * short window. The API uses the same values (DOWNLOAD_PRICE_USD /
 * DOWNLOAD_ACCESS_HOURS), so keep them in sync.
 */
export const downloadOffer = {
  name: 'Pay as you go',
  price: 1,
  currency: 'USD',
  accessHours: 24,
  tagline: 'Fill and preview for free. $1 only when you download.',
  features: [
    'All four official IRS forms',
    'Unlimited filling, validation and preview',
    'Official PDF output with flattening',
    'On-device PDF generation',
    'Re-download the same form free for 24 hours',
    'No subscription, cancel nothing',
  ],
  cta: 'Start filling free',
} as const;

export const trustPoints = [
  'Your tax data never leaves your browser by default',
  'Official IRS PDF templates, revision-tracked',
  'Free to fill and preview — $1 only when you download',
] as const;
