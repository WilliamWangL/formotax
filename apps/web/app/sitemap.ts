import type { MetadataRoute } from 'next';
import { listForms } from '@tax/tax-form-engine';
import { siteConfig } from '@/lib/site';

const staticPaths: Array<{ path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }> = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/tax-forms', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const forms = listForms();

  return [
    ...staticPaths.map((entry) => ({
      url: `${siteConfig.url}${entry.path}`,
      lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    // Each form has one canonical landing page; the keyword route and the
    // /tax-forms/:slug page canonicalise to the same URL. lastModified tracks
    // the IRS revision we ship so crawlers revisit when a template changes.
    ...forms.map((form) => ({
      url: `${siteConfig.url}${form.seo.landingPath}`,
      lastModified: new Date(form.lastReviewed),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
  ];
}
