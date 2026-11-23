import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // `*` covers search engines and AI crawlers (GPTBot, ClaudeBot,
        // PerplexityBot, Google-Extended); private app routes stay excluded.
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/login', '/register', '/forms/', '/api/payments'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
