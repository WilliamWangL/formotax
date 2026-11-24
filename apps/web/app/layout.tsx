import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { rootMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = rootMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.legalName,
    alternateName: siteConfig.name,
    url: siteConfig.url,
    // Raster logo (>=112px) is what Google's logo guidelines expect.
    logo: `${siteConfig.url}/og/apple-touch-icon.png`,
    email: siteConfig.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '1201 N Orange Street, Suite 700',
      addressLocality: 'Wilmington',
      addressRegion: 'DE',
      postalCode: '19801',
      addressCountry: 'US',
    },
    sameAs: [siteConfig.social.x, siteConfig.social.linkedin],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: 'en-US',
    // No SearchAction: the site has no on-site search endpoint, and declaring a
    // bogus target only produces invalid sitelinks-searchbox markup.
  };

  // Chrome and Edge translate whole pages by wrapping every text node in a
  // <font> element. React can no longer insert or remove nodes it owns once that
  // happens, so the next commit throws "Failed to execute 'insertBefore' on
  // 'Node'" and the page dies with "Application error: a client-side exception
  // has occurred" - typically right after Generate PDF swaps the filler for the
  // preview. Opt the document out of translation: the answers have to match the
  // statutory English wording on the PDF anyway.
  return (
    <html lang="en" translate="no" className="notranslate">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
