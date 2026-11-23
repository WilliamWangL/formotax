import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site';

const defaultTitle = `${siteConfig.name} — ${siteConfig.tagline}`;

const socialImage = {
  url: `${siteConfig.url}${siteConfig.ogImage}`,
  width: siteConfig.ogImageWidth,
  height: siteConfig.ogImageHeight,
  alt: `${siteConfig.name} — ${siteConfig.tagline}`,
};

export function buildMetadata(options: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  /** Link the machine-readable Markdown mirror of this page for AI agents. */
  markdownPath?: string;
}): Metadata {
  const url = `${siteConfig.url}${options.path}`;
  const fullTitle = options.title.includes(siteConfig.name)
    ? options.title
    : `${options.title} | ${siteConfig.name}`;

  return {
    // Use `absolute` so the root layout's brand title template does not append
    // the site name a second time.
    title: { absolute: fullTitle },
    description: options.description,
    keywords: options.keywords,
    // Private pages are noindex, so a canonical would only add noise.
    alternates: options.noIndex
      ? undefined
      : {
          canonical: url,
          types: options.markdownPath ? { 'text/markdown': options.markdownPath } : undefined,
        },
    robots: options.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: 'website',
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description: options.description,
      locale: 'en_US',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: options.description,
      images: [socialImage.url],
      site: siteConfig.twitterHandle,
    },
  };
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  // Canonical and robots are declared per page by `buildMetadata`; declaring
  // them here would leak `index, follow` and the homepage canonical into 404s.
  openGraph: {
    type: 'website',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: defaultTitle,
    description: siteConfig.description,
    locale: 'en_US',
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: siteConfig.description,
    images: [socialImage.url],
    site: siteConfig.twitterHandle,
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/og/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  category: 'finance',
};
